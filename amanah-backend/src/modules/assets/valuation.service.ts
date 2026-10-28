import { z } from "zod";
import type { Context } from "../../platform/context.js";
import {
  D,
  amount,
  metalValue,
  troyOzGrams,
} from "../../platform/money/decimal.js";
import {
  latestRates,
  fxFromSet,
  freshRate,
} from "../../platform/money/rates.js";
import { AppError } from "../../platform/http/errors.js";
export const sourceCredits = [
  {
    name: "Gold API",
    url: "https://gold-api.com",
    purpose: "Indicative precious-metal spot reference",
  },
  {
    name: "Rates By Exchange Rate API",
    url: "https://www.exchangerate-api.com",
    purpose: "Currency conversion",
  },
];
export const marketView = z.object({
  currency: z.string(),
  status: z.enum(["AVAILABLE", "STALE", "UNAVAILABLE"]),
  goldPerGram: z.string().nullable(),
  silverPerGram: z.string().nullable(),
  goldNisab: z.string().nullable(),
  silverNisab: z.string().nullable(),
  goldGrams: z.string().nullable(),
  silverGrams: z.string().nullable(),
  policyVersion: z.string().nullable(),
  rateSetId: z.string().nullable(),
  sourceAt: z.string().nullable(),
  fetchedAt: z.string().nullable(),
  goldAt: z.string().nullable(),
  silverAt: z.string().nullable(),
  basis: z.literal("PURE_METAL_SPOT_REFERENCE"),
  selectedStandard: z.string(),
  reasons: z.array(z.string()),
  credits: z.array(
    z.object({ name: z.string(), url: z.string(), purpose: z.string() }),
  ),
});
export const valuationLine = z.object({
  id: z.string(),
  kind: z.enum(["ASSET", "I_OWE", "OWED_TO_ME"]),
  label: z.string(),
  type: z.string(),
  value: z.string().nullable(),
  sourceAt: z.string().nullable(),
  reason: z.string().nullable(),
});
export const holdingsView = z.object({
  currency: z.string(),
  status: z.enum(["AVAILABLE", "PARTIAL", "UNAVAILABLE"]),
  assetCount: z.number(),
  debtCount: z.number(),
  assetsTotal: z.string().nullable(),
  iOweTotal: z.string().nullable(),
  owedToMeTotal: z.string().nullable(),
  knownAssetsSubtotal: z.string(),
  rateSetId: z.string().nullable(),
  asOf: z.string(),
  lines: z.array(valuationLine),
  reasons: z.array(z.string()),
});
export class ValuationService {
  constructor(private ctx: Context) {}
  market(uid: string, currency?: string) {
    return this.ctx.db.$transaction(
      async (db) => {
        const p = await db.userPreference.findUniqueOrThrow({
          where: { userId: uid },
          include: { policy: true },
        });
        const set = await latestRates(db);
        const target = currency ?? p.currency;
        const result: z.infer<typeof marketView> = {
          currency: target,
          status: "UNAVAILABLE",
          goldPerGram: null,
          silverPerGram: null,
          goldNisab: null,
          silverNisab: null,
          goldGrams: null,
          silverGrams: null,
          policyVersion: null,
          rateSetId: set?.id ?? null,
          sourceAt: set?.quotedAt.toISOString() ?? null,
          fetchedAt: set?.fetchedAt.toISOString() ?? null,
          goldAt: null,
          silverAt: null,
          basis: "PURE_METAL_SPOT_REFERENCE",
          selectedStandard: p.nisabStandard,
          reasons: [],
          credits: sourceCredits,
        };
        if (!set || set.quotedAt > this.ctx.now()) {
          result.reasons.push(
            "A verified daily market snapshot is unavailable.",
          );
          return result;
        }
        try {
          for (const name of ["XAU", "XAG"]) {
            const q = set.metals.find((m) => m.metal === name);
            if (!q) throw Error();
            const v = fxFromSet(
              set,
              new D(q.usdPerTroyOz.toString()).div(troyOzGrams).toString(),
              "USD",
              target,
            ).toFixed(24);
            if (name === "XAU") {
              result.goldPerGram = v;
              result.goldAt = q.quotedAt.toISOString();
            } else {
              result.silverPerGram = v;
              result.silverAt = q.quotedAt.toISOString();
            }
          }
          result.status = freshRate(
            set,
            this.ctx.now(),
            this.ctx.env.RATE_MAX_AGE_HOURS,
          )
            ? "AVAILABLE"
            : "STALE";
          if (result.status === "STALE")
            result.reasons.push(
              "Last verified reference is stale. New assessments are blocked until fresh rates return.",
            );
          const policy =
            p.policy ??
            (await this.ctx.db.zakatPolicyVersion.findFirst({
              where: {
                status: "APPROVED",
                reviewedBy: { not: null },
                approvedAt: { not: null },
              },
              orderBy: { approvedAt: "desc" },
            }));
          if (
            policy?.status === "APPROVED" &&
            policy.reviewedBy &&
            policy.approvedAt
          ) {
            result.goldGrams = policy.goldGrams.toString();
            result.silverGrams = policy.silverGrams.toString();
            result.policyVersion = policy.version;
            result.goldNisab = amount(
              fxFromSet(
                set,
                new D(result.goldGrams)
                  .mul(
                    set.metals
                      .find((m) => m.metal === "XAU")!
                      .usdPerTroyOz.toString(),
                  )
                  .div(troyOzGrams)
                  .toString(),
                "USD",
                target,
              ),
            );
            result.silverNisab = amount(
              fxFromSet(
                set,
                new D(result.silverGrams)
                  .mul(
                    set.metals
                      .find((m) => m.metal === "XAG")!
                      .usdPerTroyOz.toString(),
                  )
                  .div(troyOzGrams)
                  .toString(),
                "USD",
                target,
              ),
            );
          } else
            result.reasons.push(
              "Select an approved policy to display nisab thresholds.",
            );
        } catch {
          result.status = "UNAVAILABLE";
          result.goldPerGram = null;
          result.silverPerGram = null;
          result.goldNisab = null;
          result.silverNisab = null;
          result.reasons.push("Required metal or currency quotes are missing.");
        }
        return result;
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  holdings(uid: string) {
    return this.ctx.db.$transaction(
      async (db) => {
        const p = await db.userPreference.findUniqueOrThrow({
          where: { userId: uid },
        });
        const assets = await db.asset.findMany({
          where: { userId: uid, deletedAt: null },
          take: 1001,
        });
        const debts = await db.debt.findMany({
          where: { userId: uid, deletedAt: null },
          take: 1001,
        });
        if (assets.length > 1000 || debts.length > 1000)
          throw new AppError(
            422,
            "HOLDINGS_LIMIT",
            "Up to 1000 assets and debts can be valued at once.",
          );
        const set = await latestRates(db);
        const fresh = freshRate(
          set,
          this.ctx.now(),
          this.ctx.env.RATE_MAX_AGE_HOURS,
        );
        const result: z.infer<typeof holdingsView> = {
          currency: p.currency,
          status: "AVAILABLE",
          assetCount: assets.length,
          debtCount: debts.length,
          assetsTotal: "0.00",
          iOweTotal: "0.00",
          owedToMeTotal: "0.00",
          knownAssetsSubtotal: "0.00",
          rateSetId: set?.id ?? null,
          asOf: this.ctx.now().toISOString(),
          lines: [],
          reasons: [],
        };
        const sums = { ASSET: new D(0), I_OWE: new D(0), OWED_TO_ME: new D(0) };
        const missing = { ASSET: false, I_OWE: false, OWED_TO_ME: false };
        const convert = (v: string, c: string) => {
          if (c !== p.currency && !fresh)
            throw Error("A fresh currency quote is required.");
          return fxFromSet(set, v, c, p.currency);
        };
        for (const a of assets) {
          let value: string | null = null,
            reason: string | null = null,
            sourceAt = a.valuedOn.toISOString();
          try {
            let v: InstanceType<typeof D>;
            if (a.valuationMode === "METAL_RATE") {
              if (!fresh || !set)
                throw Error("A fresh metal quote is required.");
              const q = set.metals.find(
                (m) => m.metal === (a.type === "GOLD" ? "XAU" : "XAG"),
              );
              if (!q || !a.weightGrams || !a.purity)
                throw Error("Metal valuation is incomplete.");
              v = convert(
                metalValue(
                  a.weightGrams.toString(),
                  a.purity.toString(),
                  q.usdPerTroyOz.toString(),
                  "1",
                ).toString(),
                "USD",
              );
              sourceAt = q.quotedAt.toISOString();
            } else {
              if (!a.declaredValue) throw Error("Declared value is missing.");
              v = convert(a.declaredValue.toString(), a.currency);
              if (
                this.ctx.now().getTime() - a.valuedOn.getTime() >
                90 * 86400000
              )
                result.reasons.push(
                  `Review the manual valuation for ${a.label}; it is over 90 days old.`,
                );
            }
            sums.ASSET = sums.ASSET.add(v);
            value = amount(v);
          } catch (e) {
            missing.ASSET = true;
            reason = e instanceof Error ? e.message : "Valuation unavailable.";
          }
          result.lines.push({
            id: a.id,
            kind: "ASSET",
            label: a.label,
            type: a.type,
            value,
            sourceAt,
            reason,
          });
        }
        for (const d of debts) {
          const kind = d.direction as "I_OWE" | "OWED_TO_ME";
          let value: string | null = null,
            reason: string | null = null;
          try {
            const v = convert(d.remainingAmount.toString(), d.currency);
            sums[kind] = sums[kind].add(v);
            value = amount(v);
          } catch {
            missing[kind] = true;
            reason = "A fresh currency quote is required.";
          }
          result.lines.push({
            id: d.id,
            kind,
            label: d.label,
            type: d.direction,
            value,
            sourceAt: d.updatedAt.toISOString(),
            reason,
          });
        }
        result.knownAssetsSubtotal = amount(sums.ASSET);
        result.assetsTotal = missing.ASSET ? null : amount(sums.ASSET);
        result.iOweTotal = missing.I_OWE ? null : amount(sums.I_OWE);
        result.owedToMeTotal = missing.OWED_TO_ME
          ? null
          : amount(sums.OWED_TO_ME);
        if (Object.values(missing).some(Boolean)) {
          result.status = result.lines.some((l) => l.value !== null)
            ? "PARTIAL"
            : "UNAVAILABLE";
          result.reasons.push(
            "One or more valuations are unavailable; incomplete totals are not displayed as complete.",
          );
        }
        return result;
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
}
