import fs from "node:fs";
import { execFileSync } from "node:child_process";
const source = process.argv[2];
if (!source)
  throw Error(
    "Usage: node scripts/import-content.mjs /absolute/path/reviewer-approved-bundle.json",
  );
execFileSync(
  process.execPath,
  ["scripts/verify-content.mjs", "--release", "--file=" + source],
  { stdio: "inherit" },
);
fs.copyFileSync(source, "src/content/bundle.json");
console.log(
  "Imported reviewed edition. Install this identical bundle on the API via CONTENT_BUNDLE_PATH and regenerate the native build.",
);
