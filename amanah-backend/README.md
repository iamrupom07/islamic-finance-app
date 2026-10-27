# Amanah backend

Modular Fastify 5 / Node 24 / TypeScript API, Prisma 7.10.1 / PostgreSQL, Upstash REST, and a same-image Cloud Run rate-refresh job. The mobile app never connects to the database or Redis.

## Start

1. Install Node 24 LTS (24.11+ on the 24 line) and pnpm 11.25.0 through Corepack.
2. Run `pnpm install --frozen-lockfile` and `pnpm prisma:generate`.
3. Copy `.env.example` to `.env`. Set pooled DATABASE_URL and direct DIRECT_URL for your isolated development database. Run `pnpm keys:generate` and privately copy its output into your environment.
4. Set `MAIL_PROVIDER=development` for a private local mailbox in `.local-mail`, or configure Resend. Development mail never sends real email. Read the local token JSON and open the corresponding native verification/reset link. Production requires a verified real mail provider.
5. Review then apply migrations with `pnpm db:migrate:deploy`. Never use db push or run migrations at API cold start.
6. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, then `pnpm dev`. The API listens on 0.0.0.0:8080 by default. Public liveness is `/health/live`; private routes require app authentication.
7. For integration tests, set TEST_DATABASE_URL to an isolated database named amanah_test*. Apply the migrations to that database first, then run `pnpm test:integration`. Tests create synthetic data, not production policy.

`docs/openapi.json` is the client contract. After changing schemas, run `pnpm openapi:generate`, copy that contract to the mobile repository's contracts/openapi.json, then run mobile `pnpm api:generate` and both contract checks.

See `docs/runbooks/OPERATIONS.md`, `VERIFICATION.md` and `RELEASE_GATES.md` for release, scale-to-zero deployment, secrets/IAM, backup/restore, incident handling, content/policy installation and external acceptance. No Cloud account was provisioned or deployed in this coding environment. The Dockerfile and deployment scripts are included; image execution still needs Docker/Cloud Build validation.

This is a full source archive. Apply the new third migration additively to an existing checkpoint database; never overwrite an applied migration or delete production data to resolve a mismatch.
