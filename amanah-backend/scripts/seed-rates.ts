import "dotenv/config";
import { createDatabase } from "../src/platform/database/client.js";
import { digest } from "../src/platform/http/idempotency.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");
const db = createDatabase(url);
const now = new Date();

const fxRates = {
  USD: "1.000000000000",
  BDT: "121.500000000000",
  EUR: "0.925000000000",
  GBP: "0.772000000000",
  SAR: "3.751000000000",
  AED: "3.672500000000",
  INR: "84.070000000000",
  MYR: "4.345000000000",
  CAD: "1.385000000000",
  AUD: "1.515000000000",
};

const metalRates = {
  XAU: "2735.500000000000",
  XAG: "33.700000000000",
};

try {
  const hash = digest(JSON.stringify({ fx: fxRates, metals: metalRates, timestamp: now.toISOString().slice(0, 13) }));
  
  const existing = await db.rateSet.findUnique({ where: { hash } });
  if (existing) {
    console.log("Rates already seeded for this period.");
  } else {
    const rateSet = await db.rateSet.create({
      data: {
        provider: "manual_seed",
        quotedAt: now,
        fetchedAt: now,
        hash,
        metals: {
          create: [
            { metal: "XAU", usdPerTroyOz: metalRates.XAU, quotedAt: now },
            { metal: "XAG", usdPerTroyOz: metalRates.XAG, quotedAt: now },
          ],
        },
        fx: {
          create: Object.entries(fxRates).map(([currency, perUsd]) => ({
            currency,
            perUsd,
          })),
        },
      },
    });
    console.log("Seeded RateSet:", rateSet.id);
  }
} finally {
  await db.$disconnect();
}
