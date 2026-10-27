import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { importPKCS8, importSPKI, SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import type { Env } from "../../config/env.js";
export function tokenTools(env: Env) {
  const privateKey = importPKCS8(
    env.JWT_SIGNING_PRIVATE_KEY.replaceAll("\\n", "\n"),
    "RS256",
  );
  const publicKey = importSPKI(
    env.JWT_SIGNING_PUBLIC_KEY.replaceAll("\\n", "\n"),
    "RS256",
  );
  const previous = z
    .record(z.string().min(1).max(64), z.string().min(64))
    .parse(JSON.parse(env.JWT_PREVIOUS_PUBLIC_KEYS));
  if (Object.keys(previous).length > 3 || env.JWT_KEY_ID in previous)
    throw new Error("INVALID_KEY_ROTATION_CONFIG");
  const keys = new Map([
    [env.JWT_KEY_ID, publicKey],
    ...Object.entries(previous).map(
      ([kid, pem]) =>
        [kid, importSPKI(pem.replaceAll("\\n", "\n"), "RS256")] as const,
    ),
  ]);
  return {
    hash: (raw: string) =>
      createHmac("sha256", env.REFRESH_TOKEN_PEPPER).update(raw).digest("hex"),
    opaque: () => randomBytes(48).toString("base64url"),
    access: async (userId: string, sid: string) =>
      new SignJWT({ sid })
        .setProtectedHeader({ alg: "RS256", kid: env.JWT_KEY_ID })
        .setIssuer(env.JWT_ISSUER)
        .setAudience(env.JWT_AUDIENCE)
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime("15m")
        .setJti(randomUUID())
        .sign(await privateKey),
    verify: async (raw: string) =>
      jwtVerify(
        raw,
        async (header) => {
          const key =
            typeof header.kid === "string" ? keys.get(header.kid) : null;
          if (!key || header.alg !== "RS256")
            throw new Error("UNKNOWN_SIGNING_KEY");
          return key;
        },
        {
          algorithms: ["RS256"],
          issuer: env.JWT_ISSUER,
          audience: env.JWT_AUDIENCE,
        },
      ),
  };
}
export type TokenTools = ReturnType<typeof tokenTools>;
