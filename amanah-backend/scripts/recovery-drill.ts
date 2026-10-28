import { strict as assert } from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { Client } from "pg";
import { createDatabase } from "../src/platform/database/client.js";
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.startsWith("/amanah_test"))
  throw Error("Use an isolated amanah_test* database with applied migrations.");
const name = "amanah_restore_drill_" + randomUUID().replaceAll("-", "");
const target = new URL(source);
target.pathname = "/" + name;
const adminUrl = new URL(source);
adminUrl.pathname = "/postgres";
const admin = new Client({ connectionString: adminUrl.toString() }),
  db = createDatabase(source),
  restored = createDatabase(target.toString());
const folder = mkdtempSync(join(tmpdir(), "amanah-recovery-drill-"));
const dump = join(folder, "before-erasure.dump"),
  ledger = join(folder, "erasures.json");
const pepper = "test-only-original-pepper-" + randomUUID(),
  secret = "test-only-ledger-secret-" + randomUUID();
const env = {
  ...process.env,
  DATABASE_URL: source,
  RESTORE_DATABASE_URL: target.toString(),
  REFRESH_TOKEN_PEPPER: pepper,
  RESTORE_LEDGER_SECRET: secret,
};
function pgEnvironment(value: string) {
  const u = new URL(value);
  return {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.slice(1)),
    PGSSLMODE: u.searchParams.get("sslmode") ?? "prefer",
  };
}
const tool = (n: string) =>
  process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, n) : n;
const runLedger = (args: string[]) =>
  execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/recovery-ledger.ts", ...args],
    { env, encoding: "utf8" },
  );
let erasedId: string | undefined,
  keptId: string | undefined,
  created = false;
try {
  const erased = await db.user.create({
      data: { email: randomUUID() + "@recovery.test" },
    }),
    kept = await db.user.create({
      data: { email: randomUUID() + "@recovery.test" },
    });
  erasedId = erased.id;
  keptId = kept.id;
  await db.quranBookmark.create({
    data: { userId: erased.id, surah: 1, ayah: 1 },
  });
  for (const user of [erased, kept])
    await db.session.create({
      data: {
        userId: user.id,
        refreshHash: createHash("sha256").update(randomUUID()).digest("hex"),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  execFileSync(
    tool("pg_dump"),
    ["--format=custom", "--no-owner", "--no-privileges", "--file", dump],
    { env: pgEnvironment(source), stdio: "pipe" },
  );
  await db.$transaction(async (tx) => {
    await tx.auditEvent.create({
      data: {
        actorHash: createHash("sha256")
          .update(pepper + erased.id)
          .digest("hex"),
        entityType: "Account",
        entityId: "erased",
        action: "DELETE",
      },
    });
    await tx.user.delete({ where: { id: erased.id } });
  });
  runLedger(["export", ledger]);
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  execFileSync(
    tool("pg_restore"),
    ["--dbname", name, "--no-owner", "--no-privileges", dump],
    { env: pgEnvironment(target.toString()), stdio: "pipe" },
  );
  assert(await restored.user.findUnique({ where: { id: erased.id } }));
  const dry = JSON.parse(runLedger(["replay", ledger]));
  assert.equal(dry.matchedErasures, 1);
  assert.equal(dry.mode, "dry-run");
  assert(await restored.user.findUnique({ where: { id: erased.id } }));
  const tampered = JSON.parse(readFileSync(ledger, "utf8"));
  tampered.payload.erasures = [];
  const bad = join(folder, "tampered.json");
  writeFileSync(bad, JSON.stringify(tampered));
  assert.notEqual(
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/recovery-ledger.ts",
        "replay",
        bad,
        "--apply",
      ],
      { env, stdio: "pipe" },
    ).status,
    0,
  );
  const applied = JSON.parse(runLedger(["replay", ledger, "--apply"]));
  assert.equal(applied.matchedErasures, 1);
  assert.equal(await restored.user.count({ where: { id: erased.id } }), 0);
  assert.equal(
    await restored.quranBookmark.count({ where: { userId: erased.id } }),
    0,
  );
  assert.equal(await restored.session.count(), 0);
  assert(await restored.user.findUnique({ where: { id: kept.id } }));
  assert.equal(
    JSON.parse(runLedger(["replay", ledger, "--apply"])).matchedErasures,
    0,
  );
  console.log(
    JSON.stringify({
      result: "passed",
      engine: "PostgreSQL",
      backup: "pg_dump custom archive",
      restore: "pg_restore into isolated database",
      checks: [
        "pre-erasure account resurrected by restore",
        "signed current ledger dry-run",
        "tampered ledger rejected",
        "erasure and owned-row replay",
        "all restored sessions invalidated",
        "unaffected account retained",
        "idempotent replay",
      ],
      cloudBackupValidation: false,
    }),
  );
} finally {
  await restored.$disconnect();
  await db.user
    .deleteMany({
      where: {
        id: { in: [erasedId, keptId].filter((id): id is string => !!id) },
      },
    })
    .catch(() => {});
  await db.$disconnect();
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
  rmSync(folder, { recursive: true, force: true });
}
