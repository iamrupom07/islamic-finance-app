# Deployment, safety and operations

Use separate staging/production Neon databases, secrets, service accounts and provider accounts. Select actual regions after measuring Bangladesh-to-API and Cloud-Run-to-Neon latency. Start with 3 DB connections per instance, max 5 API instances and concurrency 10; these are initial caps, not performance promises. The public API gets only the pooled runtime URL. The direct URL belongs only to migration CI/jobs. Never run migrations in API startup.

## Local development

Copy `.env.example` to `.env`, configure both PostgreSQL URLs, run `pnpm keys:generate`, and copy its output into the private environment. `MAIL_PROVIDER=development` writes verification/reset tokens into `.local-mail/*.json` with owner-only permissions. It does not send mail and is forbidden in production. Read the generated token locally and open the appropriate `amanah://verify-email?token=...` or `amanah://complete-reset?token=...` native link. Never expose the development mailbox via HTTP or commit it. Production uses Resend with a verified sender. Google/Apple need real audiences and native configuration; missing integrations remain unavailable.

Run `pnpm install --frozen-lockfile`, `pnpm prisma:generate`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Apply reviewed migrations with `DIRECT_URL=... pnpm db:migrate:deploy`. Use `pnpm dev`. Finance fields and provider decimal prices are strings. All source examples use nonworking placeholders.

## Build and deploy

The Dockerfile separates build and production dependencies; it copies the generated Prisma client independently of pnpm's peer dependency layout. API and refresh-rates job use the same immutable image. Build and inspect it in CI/Cloud Build; scan vulnerabilities, run as nonroot, check no secrets appear in layers. Docker is not available in the coding environment; local image verification is not asserted.

Create Artifact Registry, API/job/scheduler service accounts and specific Secret Manager bindings first. Run `deploy/build-image.sh`, then deploy using the resolved image digest. Prepare complete `ENV_FILE` YAML and version-pinned `SECRET_BINDINGS` matching `.env.example`. `deploy/deploy-api.sh` uses automatic scale-to-zero, service/revision minimum 0 and request-based CPU. It never uses manual scaling 0. `deploy/deploy-job.sh` uses the same image and a job-only secret set. Manually execute and verify the job before adding `deploy/deploy-scheduler.sh`. Scheduler calls Google's Jobs API using OAuth, with only run.invoker on that job. Re-running scheduler creation requires updating the existing named schedule rather than blindly creating duplicates.

Verify live HTTPS health, 401 without app credentials, all real native journeys, min 0 in the service/revision, an idle wake-up, secret IAM, Upstash fail-closed 503 and 429, and two successful scheduled rate refreshes. There is no public refresh-rates HTTP endpoint. R2 is disabled; no upload UI or credentials exist.

## Database migration, backup and recovery

Before production migrations: create a restorable Neon branch/backup, record its identifier and retention, rehearse all migrations in staging, then run `prisma migrate deploy` from a gated direct-URL job. Never use `db push` in production. Changes are additive. Roll back application traffic to the prior compatible image; repair forward for migrations. Do not edit applied migrations or drop production schemas to fix a deployment.

Rehearse restore into an isolated branch, apply the expected migrations, verify row counts and representative user-scoped records, confirm historical snapshots and token revocation behavior, and time recovery. Keep restore evidence and operator RPO/RTO targets. Encrypted backups retain deleted data until their configured expiry; active erasure is immediate. Restoring an older branch must reapply the deletion registry/incident procedure before serving traffic. On a full restore, revoke all sessions and one-time/OAuth challenges to avoid resurrecting credentials. Qualified operations staff must own and review retention and deletion handling before launch.

`pnpm maintenance` removes expired OAuth challenges, sessions and one-time credentials. Financial idempotency and pseudonymous audit events are retained until account deletion or an explicitly approved retention migration. Do not delete idempotency entries on an arbitrary TTL and then replay old financial requests. `.expiresAt` is a retention review marker, not automatic replay expiry.

## Monitoring and incidents

Logs contain route patterns, status, request ID and duration; never raw notes, tokens, account names or amounts. Configure Google Monitoring alerts for API 5xx/error ratio, p95 regression, instance count, memory and startup failures; Neon connection/pool waits and saturation; Upstash timeout/429 spikes; rate-refresh failed jobs or quote age above 36h; and backup failures. Route alerts to actual operators. Script `scripts/load-test.ts` records only timings/counts/error rates; separately confirm idle before treating the first observed request as a cold start. No measured cloud latency or cost is claimed without staging evidence.

On provider outage, retain the last coherent source set and label it stale; never fetch per-user market quotes. Auth limiter outages reject critical actions with neutral 503. On Redis cache errors, fall back to durable/provider data. Neon failures must not produce successful saves or be converted into apparent authentication expiry. Investigate by request ID with redacted logs. Rotate compromised keys and provider credentials, revoke sessions, and preserve sanitized incident evidence.

## Source and policy installation

No religious text or approved policy is invented. Install the exact reviewed content bundle used by the mobile app via CONTENT_BUNDLE_PATH. Use the mobile `scripts/import-content.mjs` validator to check shape/hash/metadata; human accuracy and redistribution rights require independent evidence. Create a new immutable `ZakatPolicyVersion` only from the qualified reviewer's exact signed-off inputs. The supported rule shape is documented by `modules/zakat/zakat.schemas.ts`. Existing policies cannot be silently edited after approval. A pilot without approved content/policy must retain explicit unavailable states and cannot pass the full MVP release gate.

## Release decision

Run `pnpm release:check` for automated production configuration gates, then review real-device Android/iOS builds, live OAuth/email/provider tests, data isolation, deletion, content rights, policy review, legal URLs, backup restore, load metrics, monitoring ownership and deployment rollback. Source checks do not substitute for these external acceptance tests.
