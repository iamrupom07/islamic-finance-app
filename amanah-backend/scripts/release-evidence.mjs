import process from "node:process";
import console from "node:console";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const digest = (v) => crypto.createHash("sha256").update(v).digest("hex");
export function sourceFingerprint() {
  const entries = [];
  const directories = [
    "src",
    "assets",
    "load",
    "prisma",
    "content",
    "scripts",
    "contracts",
    "deploy",
  ];
  function walk(p) {
    if (!fs.existsSync(p)) return;
    for (const e of fs
      .readdirSync(p, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const n = path.join(p, e.name);
      if (e.isDirectory()) walk(n);
      else if (e.isFile()) entries.push(n + ":" + digest(fs.readFileSync(n)));
    }
  }
  for (const p of directories) walk(p);
  for (const p of [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "Dockerfile",
    "app.config.ts",
    "app.json",
    "eas.json",
    "tsconfig.json",
    "tsconfig.build.json",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js",
    "prisma.config.ts",
    ".env.example",
  ])
    if (fs.existsSync(p)) entries.push(p + ":" + digest(fs.readFileSync(p)));
  return digest(entries.sort().join("\n"));
}
export async function verifyReleaseEvidence(
  file = process.env.RELEASE_EVIDENCE_PATH ?? "docs/release-evidence.json",
) {
  if (!fs.existsSync(file))
    throw Error(
      "BLOCKED: current named-owner release evidence has not been supplied. Complete docs/release-evidence.template.json after signed-device, staging, rights, and recovery verification.",
    );
  const e = JSON.parse(fs.readFileSync(file, "utf8"));
  if (e.sourceFingerprint !== sourceFingerprint())
    throw Error(
      "BLOCKED: release evidence refers to a different source revision.",
    );
  for (const id of [
    "correctness",
    "religiousReview",
    "contentRights",
    "signedDevices",
    "security",
    "providers",
    "performance",
    "operations",
    "recovery",
    "controlledBeta",
    "storeLegal",
  ]) {
    const row = e.checks?.[id];
    if (
      row?.passed !== true ||
      typeof row.owner !== "string" ||
      !row.owner.trim() ||
      !/^https:\/\//.test(row.evidenceUrl ?? "") ||
      !row.testedAt ||
      !Number.isFinite(Date.parse(row.testedAt)) ||
      Date.parse(row.testedAt) > Date.now() ||
      Date.now() - Date.parse(row.testedAt) > 30 * 86400000
    )
      throw Error("BLOCKED: current named-owner evidence required for " + id);
  }
  if (
    !Array.isArray(e.artifacts) ||
    !e.artifacts.length ||
    e.artifacts.some(
      (a) => !a.name || !/^[a-f0-9]{64}$/.test(a.sha256) || !a.localPath,
    )
  )
    throw Error("BLOCKED: promoted local artifacts and digests required.");
  const kinds = fs.existsSync("app.config.ts")
    ? ["android-aab", "ios-ipa"]
    : ["oci-image"];
  for (const kind of kinds)
    if (!e.artifacts.some((a) => a.kind === kind))
      throw Error("BLOCKED: missing artifact " + kind);
  for (const artifact of e.artifacts) {
    const hash = crypto.createHash("sha256");
    for await (const chunk of fs.createReadStream(artifact.localPath))
      hash.update(chunk);
    if (hash.digest("hex") !== artifact.sha256)
      throw Error(
        "BLOCKED: promoted artifact bytes differ from evidence: " +
          artifact.name,
      );
  }

  return e;
}
if (process.argv.includes("--fingerprint")) console.log(sourceFingerprint());
else if (process.argv[1]?.endsWith("release-evidence.mjs")) {
  await verifyReleaseEvidence();
  console.log(
    "Evidence matches source. Verify promoted artifact digests against the signed build/image before promotion.",
  );
}
