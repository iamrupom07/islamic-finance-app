import { it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
it("binds release evidence to source, actual artifact bytes and fresh review timestamps", () => {
  const folder = mkdtempSync(join(tmpdir(), "amanah-evidence-fixture-")),
    script = resolve("scripts/release-evidence.mjs"),
    file = join(folder, "evidence.json");
  try {
    writeFileSync(join(folder, "package.json"), "{}");
    writeFileSync(join(folder, "candidate.bin"), "SOFTWARE TEST FIXTURE");
    const source = execFileSync(process.execPath, [script, "--fingerprint"], {
      cwd: folder,
      encoding: "utf8",
    }).trim();
    const row = {
      passed: true,
      owner: "Software test fixture only",
      testedAt: new Date().toISOString(),
      evidenceUrl: "https://example.test/fixture",
    };
    const evidence = {
      sourceFingerprint: source,
      artifacts: [
        {
          kind: "oci-image",
          name: "Software fixture",
          localPath: "candidate.bin",
          sha256: createHash("sha256")
            .update("SOFTWARE TEST FIXTURE")
            .digest("hex"),
        },
      ],
      checks: Object.fromEntries(
        [
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
        ].map((k) => [k, { ...row }]),
      ),
    };
    const run = () =>
      spawnSync(process.execPath, [script], {
        cwd: folder,
        env: { ...process.env, RELEASE_EVIDENCE_PATH: file },
        encoding: "utf8",
      });
    writeFileSync(file, JSON.stringify(evidence));
    expect(run().status).toBe(0);
    writeFileSync(join(folder, "candidate.bin"), "DIFFERENT");
    expect(run().stderr).toContain("artifact bytes differ");
    writeFileSync(join(folder, "candidate.bin"), "SOFTWARE TEST FIXTURE");
    writeFileSync(join(folder, "package.json"), '{"changed":true}');
    expect(run().stderr).toContain("different source revision");
    writeFileSync(join(folder, "package.json"), "{}");
    evidence.checks.security!.testedAt = "2020-01-01T00:00:00Z";
    writeFileSync(file, JSON.stringify(evidence));
    expect(run().stderr).toContain("current named-owner evidence");
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
