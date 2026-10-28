import "dotenv/config";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { rules } from "../src/modules/zakat/zakat.schemas.js";
import { createDatabase } from "../src/platform/database/client.js";
const input = z
  .object({
    version: z.string().min(1).max(32),
    status: z.literal("APPROVED"),
    goldGrams: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
    silverGrams: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
    annualRate: z.string().regex(/^0\.\d{1,8}$/),
    rules,
    sourceNotes: z.string().min(1),
    reviewedBy: z.string().min(1),
    approvedAt: z.iso.datetime(),
  })
  .strict();
const file = process.argv[2];
if (!file || !process.env.DATABASE_URL)
  throw Error("Provide a reviewer-approved JSON file and DATABASE_URL.");
const p = input.parse(JSON.parse(readFileSync(file, "utf8")));
if (new Date(p.approvedAt) > new Date())
  throw Error("Approval date cannot be in the future.");
const db = createDatabase(process.env.DATABASE_URL);
try {
  const saved = await db.zakatPolicyVersion.create({
    data: { ...p, approvedAt: new Date(p.approvedAt) },
  });
  console.log(JSON.stringify({ id: saved.id, version: saved.version }));
} finally {
  await db.$disconnect();
}
