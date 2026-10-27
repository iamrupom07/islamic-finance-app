import { execFileSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
const result = execFileSync(
  process.execPath,
  ["node_modules/openapi-typescript/bin/cli.js", "contracts/openapi.json"],
  { encoding: "utf8" },
);
if (result !== fs.readFileSync("src/core/api/schema.d.ts", "utf8"))
  throw Error("SDK_DRIFT");
execFileSync(process.execPath, ["scripts/generate-validators.mjs", "--check"], {
  stdio: "inherit",
});
console.log(
  "SDK and runtime validators match OpenAPI " +
    crypto
      .createHash("sha256")
      .update(fs.readFileSync("contracts/openapi.json"))
      .digest("hex"),
);
