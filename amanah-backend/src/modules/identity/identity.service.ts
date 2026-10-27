import { authorizeWrite } from "../../platform/auth/actor-context.js";
import { hash, verify, argon2id } from "argon2";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { z } from "zod";
import type { User } from "@prisma/client";
import type { Context } from "../../platform/context.js";
import {
  AppError,
  authRequired,
  unavailable,
} from "../../platform/http/errors.js";
import { IdentityRepository } from "./identity.repository.js";
import type { reauthInput } from "./identity.schemas.js";
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const appleKeys = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);
const generic =
  "If this email can be used, a message with the next steps will arrive shortly.";
export const userView = (u: User) => ({
  id: u.id,
  email: u.email,
  emailVerified: !!u.emailVerifiedAt,
  createdAt: u.createdAt.toISOString(),
});
export class IdentityService {
  readonly repo: IdentityRepository;
  constructor(private ctx: Context) {
    this.repo = new IdentityRepository(ctx.db);
  }
  private passwordHash(password: string) {
    return hash(password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }
  async getPublicUser(userId: string) {
    return userView(await this.repo.byId(userId));
  }
  async logout(userId: string, sessionId: string) {
    return this.ctx.db.$transaction(async (tx) => {
      await authorizeWrite(tx, userId);
      await tx.session.updateMany({
        where: { id: sessionId, userId },
        data: { revokedAt: this.ctx.now() },
      });
      return { ok: true as const };
    });
  }
  async register(email: string, password: string) {
    if (
      this.ctx.env.MAIL_PROVIDER === "disabled" &&
      this.ctx.env.NODE_ENV !== "test"
    )
      throw unavailable(
        "Email delivery must be configured before registration.",
      );
    const passwordHash = await this.passwordHash(password);
    const raw = this.ctx.tokens.opaque();
    const tokenHash = this.ctx.tokens.hash(raw);
    const existing = await this.repo.byEmail(email);
    if (existing?.emailVerifiedAt) return { message: generic };
    if (
      existing &&
      (!existing.passwordHash ||
        !(await verify(existing.passwordHash, password)))
    )
      return { message: generic };
    try {
      const user = await this.ctx.db.$transaction(async (tx) => {
        const u =
          existing ??
          (await tx.user.create({
            data: { email, passwordHash, preference: { create: {} } },
          }));
        await tx.oneTimeToken.updateMany({
          where: { userId: u.id, kind: "VERIFY", consumedAt: null },
          data: { consumedAt: this.ctx.now() },
        });
        await tx.oneTimeToken.create({
          data: {
            userId: u.id,
            kind: "VERIFY",
            hash: tokenHash,
            expiresAt: new Date(this.ctx.now().getTime() + 86400000),
          },
        });
        return u;
      });
      await this.ctx.mail.send(user.email, "VERIFY", raw);
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
    return { message: generic };
  }
  async login(email: string, password: string) {
    const user = await this.repo.byEmail(email);
    // Costly work on an unknown account limits timing-based enumeration.
    const valid = user?.passwordHash
      ? await verify(user.passwordHash, password)
      : !!(await this.passwordHash(password)) && false;
    if (!valid || !user)
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
      );
    if (!user.emailVerifiedAt)
      throw new AppError(
        403,
        "EMAIL_VERIFICATION_REQUIRED",
        "Verify your email before signing in.",
      );
    return this.createSession(user);
  }
  private async createSession(user: User) {
    const refreshToken = this.ctx.tokens.opaque();
    const session = await this.ctx.db.session.create({
      data: {
        userId: user.id,
        refreshHash: this.ctx.tokens.hash(refreshToken),
        expiresAt: new Date(this.ctx.now().getTime() + 30 * 86400000),
      },
    });
    return {
      user: userView(user),
      accessToken: await this.ctx.tokens.access(user.id, session.id),
      refreshToken,
      expiresIn: 900,
    };
  }
  async refresh(raw: string) {
    const oldHash = this.ctx.tokens.hash(raw);
    const refreshToken = this.ctx.tokens.opaque();
    const nextHash = this.ctx.tokens.hash(refreshToken);
    const outcome = await this.ctx.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${oldHash},0))::text`;
      const session = await tx.session.findUnique({
        where: { refreshHash: oldHash },
        include: { user: true },
      });
      if (!session) {
        const spent = await tx.refreshCredential.findUnique({
          where: { hash: oldHash },
        });
        if (spent)
          await tx.session.updateMany({
            where: { id: spent.sessionId, revokedAt: null },
            data: { revokedAt: this.ctx.now() },
          });
        return null; // Commit replay revocation before throwing outside the transaction.
      }
      if (session.revokedAt || session.expiresAt <= this.ctx.now()) return null;
      const changed = await tx.session.updateMany({
        where: { id: session.id, refreshHash: oldHash, revokedAt: null },
        data: { refreshHash: nextHash, lastUsedAt: this.ctx.now() },
      });
      if (!changed.count) return null;
      await tx.refreshCredential.create({
        data: { hash: oldHash, sessionId: session.id },
      });
      return session;
    });
    if (!outcome) throw authRequired();
    return {
      user: userView(outcome.user),
      accessToken: await this.ctx.tokens.access(outcome.userId, outcome.id),
      refreshToken,
      expiresIn: 900,
    };
  }
  async consume(raw: string, kind: "VERIFY" | "RESET", password?: string) {
    const passwordHash = password
      ? await this.passwordHash(password)
      : undefined;
    return this.ctx.db.$transaction(async (tx) => {
      const token = await tx.oneTimeToken.findUnique({
        where: { hash: this.ctx.tokens.hash(raw) },
      });
      if (
        !token ||
        token.kind !== kind ||
        token.consumedAt ||
        token.expiresAt <= this.ctx.now()
      )
        throw new AppError(
          400,
          "TOKEN_INVALID",
          "This link is invalid or expired.",
        );
      const change = await tx.oneTimeToken.updateMany({
        where: { id: token.id, consumedAt: null },
        data: { consumedAt: this.ctx.now() },
      });
      if (!change.count)
        throw new AppError(
          400,
          "TOKEN_INVALID",
          "This link has already been used.",
        );
      if (kind === "VERIFY")
        await tx.user.update({
          where: { id: token.userId },
          data: { emailVerifiedAt: this.ctx.now() },
        });
      else {
        await tx.user.update({
          where: { id: token.userId },
          data: { passwordHash },
        });
        await tx.session.updateMany({
          where: { userId: token.userId },
          data: { revokedAt: this.ctx.now() },
        });
        await tx.oneTimeToken.updateMany({
          where: { userId: token.userId, kind: "RESET", consumedAt: null },
          data: { consumedAt: this.ctx.now() },
        });
      }
      return { ok: true as const };
    });
  }
  async forgot(email: string) {
    const user = await this.repo.byEmail(email);
    if (user?.emailVerifiedAt && user.passwordHash) {
      const raw = this.ctx.tokens.opaque();
      await this.ctx.db.$transaction(async (tx) => {
        await tx.oneTimeToken.updateMany({
          where: { userId: user.id, kind: "RESET", consumedAt: null },
          data: { consumedAt: this.ctx.now() },
        });
        await tx.oneTimeToken.create({
          data: {
            userId: user.id,
            kind: "RESET",
            hash: this.ctx.tokens.hash(raw),
            expiresAt: new Date(this.ctx.now().getTime() + 1800000),
          },
        });
      });
      // Hide delivery failures as well as unknown users; alert via a redacted operational code.
      try {
        await this.ctx.mail.send(email, "RESET", raw);
      } catch {
        /* Recovery delivery is monitored by provider. */
      }
    }
    return { message: generic };
  }
  async appleNonce() {
    const nonce = this.ctx.tokens.opaque();
    await this.ctx.db.oAuthChallenge.create({
      data: {
        hash: this.ctx.tokens.hash(nonce),
        expiresAt: new Date(this.ctx.now().getTime() + 300000),
      },
    });
    return { nonce };
  }
  async providerClaims(
    provider: "GOOGLE" | "APPLE",
    idToken: string,
    nonce?: string,
  ) {
    const audiences = (
      provider === "GOOGLE"
        ? this.ctx.env.GOOGLE_ALLOWED_CLIENT_IDS
        : this.ctx.env.APPLE_ALLOWED_CLIENT_IDS
    )
      .split(",")
      .filter(Boolean);
    if (!audiences.length)
      throw unavailable("This sign-in option has not been configured.");
    try {
      const { payload } = await jwtVerify(
        idToken,
        provider === "GOOGLE" ? googleKeys : appleKeys,
        {
          algorithms: ["RS256"],
          issuer:
            provider === "GOOGLE"
              ? ["https://accounts.google.com", "accounts.google.com"]
              : "https://appleid.apple.com",
          audience: audiences,
        },
      );
      if (
        !payload.sub ||
        typeof payload.email !== "string" ||
        !(payload.email_verified === true || payload.email_verified === "true")
      )
        throw Error();
      if (provider === "APPLE") {
        if (!nonce || payload.nonce !== nonce) throw Error();
        const used = await this.ctx.db.oAuthChallenge.updateMany({
          where: {
            hash: this.ctx.tokens.hash(nonce),
            consumedAt: null,
            expiresAt: { gt: this.ctx.now() },
          },
          data: { consumedAt: this.ctx.now() },
        });
        if (!used.count) throw Error();
      }
      return { subject: payload.sub, email: payload.email.toLowerCase() };
    } catch {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Unable to verify this identity.",
      );
    }
  }
  async social(provider: "GOOGLE" | "APPLE", idToken: string, nonce?: string) {
    const claims = await this.providerClaims(provider, idToken, nonce);
    const identity = await this.repo.identity(provider, claims.subject);
    if (identity) return this.createSession(identity.user);
    if (await this.repo.byEmail(claims.email))
      throw new AppError(
        409,
        "IDENTITY_LINK_REQUIRED",
        "Sign in using your existing method. Automatic account linking is disabled.",
      );
    try {
      const u = await this.ctx.db.user.create({
        data: {
          email: claims.email,
          emailVerifiedAt: this.ctx.now(),
          identities: { create: { provider, subject: claims.subject } },
          preference: { create: {} },
        },
      });
      return this.createSession(u);
    } catch (e) {
      if ((e as { code?: string }).code === "P2002")
        throw new AppError(
          409,
          "IDENTITY_LINK_REQUIRED",
          "Please retry using your existing sign-in method.",
        );
      throw e;
    }
  }
  async reauth(userId: string, input: z.infer<typeof reauthInput>) {
    const user = await this.repo.byId(userId);
    let valid = false;
    if (input.password && user.passwordHash)
      valid = await verify(user.passwordHash, input.password);
    if (input.provider && input.idToken) {
      const claims = await this.providerClaims(
        input.provider,
        input.idToken,
        input.nonce,
      );
      const identity = await this.repo.identity(input.provider, claims.subject);
      valid = identity?.userId === userId;
    }
    if (!valid)
      throw new AppError(
        401,
        "REAUTH_REQUIRED",
        "Confirm your sign-in method to continue.",
      );
    const proof = this.ctx.tokens.opaque();
    await this.ctx.db.oneTimeToken.create({
      data: {
        userId,
        kind: "DELETE",
        hash: this.ctx.tokens.hash(proof),
        expiresAt: new Date(this.ctx.now().getTime() + 300000),
      },
    });
    return { proof };
  }
}
