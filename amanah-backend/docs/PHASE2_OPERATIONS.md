# Staging, recovery and controlled beta

## Ownership and setup

Assign real names and escalation contacts before promotion: release owner, qualified religious/content reviewer, security/privacy owner, infrastructure on-call and beta support. Fill the release evidence template only after work is performed. No names or completed approvals are supplied by this update.

Keep Android/iOS native first. Use actual HTTPS origins, app IDs, signing keys, EAS project, support address, legal URLs, official icon and authentication provider identifiers. Rebuild native binaries after installing audio, biometric, system-UI or SQLCipher configuration. JS updates do not add native capabilities.

## Staging verification

Apply the migration before the API/mobile update. The runtime image includes the exact content bundle and lock. Keep minimum Cloud Run instances at zero; derive maximum instances, concurrency and PostgreSQL connection budgets from measured load. Separate API, rate-job and scheduler identities and least-privilege secrets. The read-only `deploy/verify-staging.sh` captures configured image/revision, scaling, scheduler and secret references; its private intermediate files are removed even on failure. A configuration report is not execution/monitoring evidence.

Run the existing deploy/scheduler/scaling tools from a trusted configured environment. Verify one successful published daily rate reference, proper source times, deduplication and bounded retries, fresh/stale/unavailable behavior, prayer rollover, and failure recovery. Market/prayer integrations remain keyless/free. CPU, database, cache, storage and third-party audio bandwidth are separate operating costs; no zero-cost hosting claim is made.

With k6 installed, create isolated synthetic test accounts and records. Provide STAGING_API_ORIGIN (HTTPS origin without /v1), STAGING_TEST_ACCESS_TOKEN or JSON STAGING_TEST_ACCESS_TOKENS, and AMANAH_STAGING_TEST=true. Run `k6 run load/staging.js`. It measures bounded reads and sampled exports with arrival rates 1/10/25 per second; its VU cap is 25, not a customer capacity claim. ENABLE_SYNTHETIC_WRITES=true enables sampled create/delete requests only against those synthetic accounts. Use BDT account preferences for those fixtures. Verify cleanup and successful/rejected operation counts. Use multiple tokens for separate account workloads and refresh them for longer tests.

Repeat first-after-idle versus warm journeys, 1/10/25 concurrent clients, uneven holdings/transactions, searches on-device, bursts, sustained/soak, report/export overlap and quota/provider failures. Record client/proxy/API/DB/pool timing separately. The included harness was syntax checked, not run against a deployed target. No staging latency numbers are invented.

## Recovery

Run `pnpm test:recovery` only with TEST_DATABASE_URL pointing to an isolated amanah_test* database with all migrations and a role allowed to create/drop isolated drill databases. PostgreSQL 16 pg_dump/pg_restore must be on PATH; PG_BIN_DIR can point to their directory. The drill backs up before erasure, restores to amanah_restore_drill_*, verifies a signed current ledger, rejects tampering, replays account/owned-row erasure, revokes all restored sessions, retains the other account and repeats safely. It never targets a production database name.

For operational ledger export, supply a private output path, DATABASE_URL, the original REFRESH_TOKEN_PEPPER and an independent random RESTORE_LEDGER_SECRET of at least 32 characters, then run `pnpm recovery:ledger export /private/erasures.json`. The output is mode 0600, signed, and refuses overwriting an existing file. Store it in a restricted, versioned system outside the database backup boundary. Treat its pseudonymous hashes as sensitive; never publish it or include it in support ZIPs.

Replay defaults to dry-run: set RESTORE_DATABASE_URL to an isolated amanah_restore_* target and run `pnpm recovery:ledger replay /private/erasures.json`. Verify the ledger’s coverage/freshness against the live audit stream and backup cutoff, then add --apply. The tool rejects invalid signatures, wrong original pepper, future or older-than-24-hour ledgers, and unsafe database names. Apply erases matching restored users by stable pseudonymous identity and invalidates every restored session. It does not silently choose a production target.

A fresh timestamp alone cannot establish complete erasure coverage. The owner must arrange durable continuous ledger archival and reconcile the final primary/audit checkpoint during cutover; freeze writes where necessary. Lost originals/keys or an archive gap are a stop condition. If actor-hash peppers changed, archive and replay a separately signed ledger for every original pepper/key period; the replay tool handles one original pepper per run. Incomplete key history blocks recovery. Rehearse provider-native snapshots/PITR and actual restoration isolation, not just logical pg_dump backups. Verify token/key/pepper rotation, notification queues and account revocations after restore. Record RPO/RTO, owners and alert/rollback outcomes.

## Beta protocol

Use signed internal builds with consented users representing small phones, tablets, Bangla/English, RTL/large text, different prayer settings/currencies/holdings and intermittent connectivity. Establish baseline crash/error rates and privacy-safe request IDs; exclude tokens, notes, personal text and query strings from logs. Exercise repayment/payment retries, version conflicts, stale quotes, edition mismatch, offline recovery, audio interruptions/seek/resume/download deletion and logout/account switch during in-flight work. Monitor support and operational signals; rehearse stopping traffic and reverting image/mobile rollout while keeping additive migrations intact. Do not delete columns to roll back this phase.
