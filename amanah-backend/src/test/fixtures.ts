import { generateKeyPairSync, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { loadEnv } from "../config/env.js";
export const now = new Date("2026-10-26T06:00:00Z");
export function testEnv() {
  const k = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return loadEnv({
    NODE_ENV: "test",
    DATABASE_URL:
      process.env.TEST_DATABASE_URL ??
      "postgresql://test:test@127.0.0.1:55432/amanah_test",
    JWT_SIGNING_PRIVATE_KEY: String(
      k.privateKey.export({ format: "pem", type: "pkcs8" }),
    ),
    JWT_SIGNING_PUBLIC_KEY: String(
      k.publicKey.export({ format: "pem", type: "spki" }),
    ),
    REFRESH_TOKEN_PEPPER: "test-only-not-secret-pepper-12345678",
    CURSOR_SECRET: "test-only-not-secret-cursor-12345678",
    LOG_LEVEL: "silent",
  });
}
export const decimal = (v: string) => new Prisma.Decimal(v);
export const preference: any = {
  userId: randomUUID(),
  currency: "BDT",
  timezone: "Asia/Dhaka",
  nisabStandard: "SILVER",
  hijriAnchor: "1447-01-01",
  continuityConfirmed: true,
};
// Fictional policy values solely for deterministic software testing; never seeded into a deployed database.
export const policy: any = {
  id: randomUUID(),
  version: "TEST_ONLY",
  status: "APPROVED",
  reviewedBy: "TEST FIXTURE, NOT RELIGIOUS APPROVAL",
  approvedAt: now,
  goldGrams: decimal("100"),
  silverGrams: decimal("500"),
  annualRate: decimal("0.025"),
  rules: {
    assetTypes: ["CASH", "SAVINGS", "GOLD", "SILVER"],
    debtRule: "DUE_WITHIN_PERIOD",
    receivableRule: "RECOVERABLE",
    yearRule: "CONTINUITY_ATTESTED_ISLAMIC_CIVIL",
  },
};
export const rates: any = {
  id: randomUUID(),
  provider: "TEST_FIXTURE",
  quotedAt: now,
  metals: [
    { metal: "XAU", usdPerTroyOz: decimal("3110.34768"), quotedAt: now },
    { metal: "XAG", usdPerTroyOz: decimal("31.1034768"), quotedAt: now },
  ],
  fx: [
    { currency: "USD", perUsd: decimal("1") },
    { currency: "BDT", perUsd: decimal("100") },
  ],
};
export const asset = (overrides: any = {}) => ({
  id: randomUUID(),
  type: "CASH",
  label: "Fictional test holding",
  currency: "BDT",
  valuationMode: "MANUAL",
  declaredValue: decimal("100000"),
  weightGrams: null,
  purity: null,
  valuedOn: now,
  updatedAt: now,
  ...overrides,
});
export const debt = (overrides: any = {}) => ({
  id: randomUUID(),
  direction: "I_OWE",
  label: "Fictional debt",
  currency: "BDT",
  originalAmount: decimal("1000"),
  remainingAmount: decimal("1000"),
  dueOn: new Date("2026-01-01"),
  recoverability: "RECOVERABLE",
  status: "OPEN",
  updatedAt: now,
  ...overrides,
});
