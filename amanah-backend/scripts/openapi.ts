import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const env = loadEnv({
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://unused:unused@127.0.0.1:5432/unused",
  JWT_SIGNING_PRIVATE_KEY: String(
    keys.privateKey.export({ type: "pkcs8", format: "pem" }),
  ),
  JWT_SIGNING_PUBLIC_KEY: String(
    keys.publicKey.export({ type: "spki", format: "pem" }),
  ),
  REFRESH_TOKEN_PEPPER: "contract-generation-only-not-a-secret",
  CURSOR_SECRET: "contract-generation-only-not-a-secret",
  LOG_LEVEL: "silent",
});
const { app } = await createApp({ env });
const json = JSON.stringify(app.swagger(), null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync("docs/openapi.json", "utf8") !== json)
    throw new Error("OPENAPI_DRIFT");
  console.log("OpenAPI contract unchanged.");
} else {
  writeFileSync("docs/openapi.json", json);
  console.log("Wrote docs/openapi.json");
}
await app.close();
