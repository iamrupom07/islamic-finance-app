import { it, expect } from "vitest";
import { SignJWT, importPKCS8 } from "jose";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { tokenTools } from "./tokens.js";
import { testEnv } from "../../test/fixtures.js";
it("verifies issuer, audience and key ID and rejects forged claim contexts", async () => {
  const env = testEnv();
  const tools = tokenTools(env);
  const userId = randomUUID(),
    sid = randomUUID();
  const access = await tools.access(userId, sid);
  expect((await tools.verify(access)).payload.sub).toBe(userId);
  const key = await importPKCS8(env.JWT_SIGNING_PRIVATE_KEY, "RS256");
  for (const wrong of ["issuer", "audience", "key"]) {
    const forged = await new SignJWT({ sid })
      .setProtectedHeader({
        alg: "RS256",
        kid: wrong === "key" ? "unknown" : env.JWT_KEY_ID,
      })
      .setIssuer(wrong === "issuer" ? "wrong" : env.JWT_ISSUER)
      .setAudience(wrong === "audience" ? "wrong" : env.JWT_AUDIENCE)
      .setSubject(userId)
      .setExpirationTime("1m")
      .sign(key);
    await expect(tools.verify(forged)).rejects.toThrow();
  }
});
it("supports an explicitly retained previous public key during a short rotation window", async () => {
  const env = testEnv();
  const old = tokenTools(env);
  const access = await old.access(randomUUID(), randomUUID());
  const next = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rotated = tokenTools({
    ...env,
    JWT_KEY_ID: "next",
    JWT_SIGNING_PRIVATE_KEY: String(
      next.privateKey.export({ format: "pem", type: "pkcs8" }),
    ),
    JWT_SIGNING_PUBLIC_KEY: String(
      next.publicKey.export({ format: "pem", type: "spki" }),
    ),
    JWT_PREVIOUS_PUBLIC_KEYS: JSON.stringify({
      [env.JWT_KEY_ID]: env.JWT_SIGNING_PUBLIC_KEY,
    }),
  });
  expect((await rotated.verify(access)).protectedHeader.kid).toBe(
    env.JWT_KEY_ID,
  );
});
