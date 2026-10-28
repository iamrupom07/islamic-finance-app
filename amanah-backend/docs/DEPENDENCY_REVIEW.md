# Phase 2 dependency review

The complete frozen graph is audited by `pnpm audit:fresh`; the report and graph/timestamp attestation are regenerated. Release checks run the audit again, including development/build tooling, rather than trusting an old report.

Expo is updated compatibly within SDK 58. Native audio, local authentication and system UI use the SDK bundled version ranges. The resolution pins node-forge 1.4.2 within the upstream compatible range. A scoped @expo/cli > zod override uses 4.6.7. That major override is deliberate: installed CLI plugin/output/MCP schema code uses compatible APIs. `pnpm dependencies:check` exercises valid/invalid plugin, output and typed MCP parameters plus RSA sign/verify; both native source exports and prebuild configuration are checked separately. This is a supported-source compatibility verification for the delivered graph, not a general assertion about future CLI versions.

The fresh audit reports zero advisories for the current graph; the inherited high findings are not suppressed/ignored. Reassess these overrides on future SDK upgrades and rerun all checks. A zero-advisory registry result does not prove the absence of vulnerabilities or replace device/cloud security review.
