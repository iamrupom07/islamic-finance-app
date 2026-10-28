# Production promotion gate

Do not promote these source updates solely because local tests or Hermes exports pass. The exact candidate still needs:

1. A qualified named reviewer’s approved zakat and prayer interval policies, supported cases and local timetable validation. Phase 1 gating remains intact.
2. Content/legal approval for Tanzil, QuranEnc and the selected MP3Quran recordings, with the included notices and update obligations. Dua audio remains unavailable until its separate permissions are verified. A Bengali Quran translation is not installed.
3. Real branding, native package/bundle identifiers, EAS project/signing, privacy/terms/support details and store declarations.
4. Signed Android AAB and iOS IPA installed on representative small phones/tablets. Test RTL Arabic, Bangla, dark/light, large text, screen readers, keyboard/forms, modal focus, notification permissions, SQLCipher, biometric fallback, recording interruptions, route changes, headphones/Bluetooth, lock screen, background, termination and low storage.
5. Actual staging Cloud Run/Neon/Upstash jobs/IAM/secrets, quota and failure recovery; cold starts, pool waits, p50/p95/p99, errors/completions and representative data/load; delivered alerts and traffic rollback.
6. Provider quota/timeouts/stale source cases and market closures on the deployed candidate; do not call an indicative source-fetch timestamp an exchange trade timestamp.
7. A current signed erasure ledger outside the database recovery boundary, restored-session revocation, real cloud restoration, deletion replay, ownership validation, RPO/RTO and incident contacts. Local PostgreSQL rehearsal does not verify a Neon backup configuration.
8. A controlled beta with consented representative users and no unresolved correctness blockers. Assign accountable named people for release, religion/content, security/privacy, infrastructure/on-call and beta support; names were not supplied here.

Use `docs/release-evidence.template.json` as a schema only. Its checks start false. Fill real owner names, evidence URLs and timestamps after execution, bind the current source fingerprint, and provide actual local candidate artifacts with kind, name, localPath and SHA256. Frontend requires `android-aab` and `ios-ipa`; backend requires `oci-image`. The checker verifies hashes of the actual bytes and rejects stale/wrong-source evidence. It does not cryptographically sign binaries or independently validate a reviewer’s qualifications.

`pnpm release:check` runs a fresh audit of the current complete dependency graph, then checks evidence and production prerequisites. Missing evidence intentionally fails. Historical audit JSON is not accepted as current release proof.
