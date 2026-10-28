import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createDatabase } from "../src/platform/database/client.js";
const action = process.argv[2],
  path = process.argv[3];
const secret = process.env.RESTORE_LEDGER_SECRET,
  pepper = process.env.REFRESH_TOKEN_PEPPER;
if (!path || !secret || secret.length < 32 || !pepper || pepper.length < 32)
  throw Error(
    "Provide an output/input ledger path, RESTORE_LEDGER_SECRET and original REFRESH_TOKEN_PEPPER.",
  );
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const sign = (v: unknown) =>
  createHmac("sha256", secret).update(JSON.stringify(v)).digest("hex");
const schema = z
  .object({
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    pepperId: z.string().length(64),
    erasures: z.array(
      z.object({
        actorHash: z.string().regex(/^[a-f0-9]{64}$/),
        occurredAt: z.iso.datetime(),
      }),
    ),
  })
  .strict();
if (action === "export") {
  const url = process.env.DATABASE_URL;
  if (!url) throw Error("DATABASE_URL required");
  const db = createDatabase(url);
  try {
    const events = await db.auditEvent.findMany({
      where: { entityType: "Account", action: "DELETE" },
      orderBy: { id: "asc" },
      select: { actorHash: true, occurredAt: true },
      take: 100001,
    });
    if (events.length > 100000)
      throw Error(
        "Ledger requires a reviewed paginated export before this size.",
      );
    const payload = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      pepperId: hash(pepper),
      erasures: events.map((e) => ({
        ...e,
        occurredAt: e.occurredAt.toISOString(),
      })),
    };
    writeFileSync(
      path,
      JSON.stringify({ payload, signature: sign(payload) }, null, 2),
      { mode: 0o600, flag: "wx" },
    );
    console.log(
      "Ledger exported. Store it outside database backups, in a restricted versioned store. Do not publish it.",
    );
  } finally {
    await db.$disconnect();
  }
} else if (action === "replay") {
  const raw = JSON.parse(readFileSync(path, "utf8")),
    payload = schema.parse(raw.payload);
  if (
    typeof raw.signature !== "string" ||
    !/^[a-f0-9]{64}$/.test(raw.signature) ||
    !timingSafeEqual(
      Buffer.from(sign(payload), "hex"),
      Buffer.from(raw.signature, "hex"),
    )
  )
    throw Error("INVALID_LEDGER_SIGNATURE");
  if (payload.pepperId !== hash(pepper))
    throw Error("ORIGINAL_PEPPER_REQUIRED");
  if (
    Date.parse(payload.exportedAt) > Date.now() ||
    Date.now() - Date.parse(payload.exportedAt) > 24 * 3600000
  )
    throw Error(
      "FRESH_LEDGER_REQUIRED: export from the current primary before the drill.",
    );
  const target = process.env.RESTORE_DATABASE_URL;
  if (!target) throw Error("RESTORE_DATABASE_URL required");
  if (!/^\/amanah_restore_[a-z0-9_]+$/.test(new URL(target).pathname))
    throw Error("Only an isolated amanah_restore_* database is permitted.");
  const db = createDatabase(target),
    hashes = new Set(payload.erasures.map((e) => e.actorHash));
  let matched = 0,
    cursor: string | undefined;
  try {
    if (process.argv.includes("--apply")) await db.session.deleteMany();
    while (true) {
      const users = await db.user.findMany({
        where: cursor ? { id: { gt: cursor } } : {},
        orderBy: { id: "asc" },
        select: { id: true },
        take: 250,
      });
      const ids = users
        .filter((u) => hashes.has(hash(pepper + u.id)))
        .map((u) => u.id);
      matched += ids.length;
      if (ids.length && process.argv.includes("--apply"))
        await db.user.deleteMany({ where: { id: { in: ids } } });
      if (users.length < 250) break;
      cursor = users.at(-1)!.id;
    }
    console.log(
      JSON.stringify({
        mode: process.argv.includes("--apply") ? "applied" : "dry-run",
        matchedErasures: matched,
        allRestoredSessionsRevoked: process.argv.includes("--apply"),
        ledgerExportedAt: payload.exportedAt,
      }),
    );
  } finally {
    await db.$disconnect();
  }
} else
  throw Error(
    "Usage: recovery-ledger.ts export|replay /private/path.json [--apply]",
  );
