import fs from "node:fs";
import { execFileSync } from "node:child_process";
const audit = JSON.parse(fs.readFileSync("docs/DEPENDENCY_AUDIT.json", "utf8"));
const findings = audit.metadata?.vulnerabilities;
if (!findings || findings.high || findings.critical)
  throw Error(
    "BLOCKED: unresolved high/critical dependency findings. See docs/DEPENDENCY_REVIEW.md and rerun the audit after a compatible remediation.",
  );
const names = [
  "AMANAH_ANDROID_PACKAGE",
  "AMANAH_IOS_BUNDLE_ID",
  "EAS_PROJECT_ID",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_PRIVACY_URL",
  "EXPO_PUBLIC_TERMS_URL",
  "EXPO_PUBLIC_SUPPORT_EMAIL",
];
const missing = names.filter((n) => !process.env[n]);
if (missing.length) throw Error("BLOCKED: " + missing.join(", "));
for (const n of [
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_PRIVACY_URL",
  "EXPO_PUBLIC_TERMS_URL",
])
  if (!process.env[n].startsWith("https://"))
    throw Error(n + " must use HTTPS.");
if (!fs.existsSync("assets/brand/official-icon.png"))
  throw Error("BLOCKED: official icon/rights evidence required.");
execFileSync(process.execPath, ["scripts/verify-content.mjs", "--release"], {
  stdio: "inherit",
});
console.log(
  "Automated release prerequisites present. App signing, social sign-in equivalency, legal/privacy review, content rights and device/staging evidence still require owner review.",
);
