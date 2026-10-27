import { z } from "zod";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import { ok } from "../../platform/http/schemas.js";
import * as s from "./identity.schemas.js";
import { IdentityService } from "./identity.service.js";
import { authLimit } from "./identity.controller.js";
export function identityRoutes(route: Register, ctx: Context) {
  const service = new IdentityService(ctx);
  route(
    "POST",
    "/v1/auth/apple/nonce",
    "Identity",
    z.object({ nonce: z.string() }),
    async (req) => {
      await authLimit(ctx, req);
      return service.appleNonce();
    },
    { public: true },
  );
  route(
    "POST",
    "/v1/auth/register",
    "Identity",
    s.message,
    async (req) => {
      await authLimit(ctx, req);
      const b = s.credentials.parse(req.body);
      return service.register(b.email, b.password);
    },
    { body: s.credentials, public: true },
  );
  route(
    "POST",
    "/v1/auth/login",
    "Identity",
    s.sessionResponse,
    async (req) => {
      await authLimit(ctx, req);
      const b = s.loginInput.parse(req.body);
      return service.login(b.email, b.password);
    },
    { body: s.loginInput, public: true },
  );
  route(
    "POST",
    "/v1/auth/refresh",
    "Identity",
    s.sessionResponse,
    async (req) => {
      await authLimit(ctx, req);
      return service.refresh(s.refreshInput.parse(req.body).refreshToken);
    },
    { body: s.refreshInput, public: true },
  );
  route("POST", "/v1/auth/logout", "Identity", ok, (req) =>
    service.logout(req.actor.userId, req.actor.sessionId),
  );
  route(
    "POST",
    "/v1/auth/verify-email",
    "Identity",
    ok,
    async (req) => {
      await authLimit(ctx, req);
      return service.consume(s.tokenInput.parse(req.body).token, "VERIFY");
    },
    { body: s.tokenInput, public: true },
  );
  route(
    "POST",
    "/v1/auth/password/forgot",
    "Identity",
    s.message,
    async (req) => {
      await authLimit(ctx, req);
      return service.forgot(s.emailInput.parse(req.body).email);
    },
    { body: s.emailInput, public: true },
  );
  route(
    "POST",
    "/v1/auth/password/reset",
    "Identity",
    ok,
    async (req) => {
      await authLimit(ctx, req);
      const b = s.resetInput.parse(req.body);
      return service.consume(b.token, "RESET", b.password);
    },
    { body: s.resetInput, public: true },
  );
  for (const provider of ["GOOGLE", "APPLE"] as const)
    route(
      "POST",
      `/v1/auth/${provider.toLowerCase()}`,
      "Identity",
      s.sessionResponse,
      async (req) => {
        await authLimit(ctx, req);
        const b = s.socialInput.parse(req.body);
        return service.social(provider, b.idToken, b.nonce);
      },
      { body: s.socialInput, public: true },
    );
  route(
    "POST",
    "/v1/auth/reauth",
    "Identity",
    z.object({ proof: z.string() }),
    async (req) => {
      await authLimit(ctx, req);
      return service.reauth(req.actor.userId, s.reauthInput.parse(req.body));
    },
    { body: s.reauthInput },
  );
  return service;
}
