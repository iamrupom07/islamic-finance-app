import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { verifyReleaseEvidence } from "./release-evidence.mjs";
execFileSync(process.execPath, ["scripts/audit-dependencies.mjs"], {
  stdio: "inherit",
});
await verifyReleaseEvidence();
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
