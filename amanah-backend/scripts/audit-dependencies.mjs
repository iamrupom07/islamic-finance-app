import process from "node:process";
import console from "node:console";
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
const files = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];
const graphHash = crypto
  .createHash("sha256")
  .update(files.map((p) => p + "\n" + fs.readFileSync(p, "utf8")).join("\n"))
  .digest("hex");
const result = spawnSync("pnpm", ["audit", "--json"], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  throw Error(
    "Dependency audit could not be completed. No previous report will be accepted.",
  );
}
if (!report.metadata?.vulnerabilities)
  throw Error("Audit result missing vulnerability metadata.");
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(
  "docs/DEPENDENCY_AUDIT.json",
  JSON.stringify(report, null, 2) + "\n",
);
fs.writeFileSync(
  "docs/dependency-attestation.json",
  JSON.stringify(
    {
      graphHash,
      checkedAt: new Date().toISOString(),
      scope: "complete frozen dependency graph",
      vulnerabilities: report.metadata.vulnerabilities,
    },
    null,
    2,
  ) + "\n",
);
if (
  report.metadata.vulnerabilities.high ||
  report.metadata.vulnerabilities.critical
)
  process.exit(1);
console.log(
  "Fresh dependency audit passed; exact lockfile and resolution configuration recorded.",
);
