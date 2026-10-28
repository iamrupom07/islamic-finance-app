import { z } from "zod";
import {
  positiveMoney,
  civilDate,
  currency,
  money,
} from "../../platform/http/schemas.js";
export const rules = z
  .object({
    assetTypes: z
      .array(
        z.enum([
          "CASH",
          "SAVINGS",
          "GOLD",
          "SILVER",
          "INVESTMENT",
          "BUSINESS_INVENTORY",
        ]),
      )
      .min(1),
    debtRule: z.enum(["NONE", "DUE_WITHIN_PERIOD"]),
    receivableRule: z.enum(["NONE", "RECOVERABLE"]),
    yearRule: z.literal("CONTINUITY_ATTESTED_ISLAMIC_CIVIL"),
  })
  .strict();
export const line = z.object({
  weightGrams: z.string().nullable().optional(),
  purity: z.string().nullable().optional(),
  metalUsdPerTroyOz: z.string().nullable().optional(),
  fxRateApplied: z.string().nullable().optional(),
  id: z.string(),
  label: z.string(),
  kind: z.enum(["ASSET", "RECEIVABLE", "LIABILITY"]),
  included: z.boolean(),
  reason: z.string(),
  originalAmount: z.string().nullable(),
  originalCurrency: z.string(),
  convertedAmount: z.string().nullable(),
  valuationMethod: z.string(),
  sourceAt: z.string().nullable(),
});
export const zakatSummary = z.object({
  policyDetails: z
    .object({
      sourceNotes: z.string().nullable(),
      reviewedBy: z.string(),
      approvedAt: z.string(),
      goldGrams: z.string(),
      silverGrams: z.string(),
      rules,
    })
    .optional(),
  nisabQuote: z
    .object({
      usdPerTroyOz: z.string(),
      fxRateApplied: z.string(),
      troyOunceGrams: z.string(),
    })
    .optional(),
  status: z.enum([
    "NO_ASSETS",
    "BELOW_NISAB",
    "ESTIMATE_ONLY",
    "YEAR_IN_PROGRESS",
    "POTENTIALLY_DUE",
    "DATA_STALE",
    "CALCULATION_UNAVAILABLE",
  ]),
  currency,
  estimate: z.string().nullable(),
  netEligibleWealth: z.string().nullable(),
  eligibleAssets: z.string().nullable(),
  eligibleReceivables: z.string().nullable(),
  eligibleLiabilities: z.string().nullable(),
  nisabValue: z.string().nullable(),
  nisabStandard: z.enum(["GOLD", "SILVER"]),
  nisabGrams: z.string().nullable(),
  annualRate: z.string().nullable(),
  policyVersion: z.string().nullable(),
  policyId: z.string().nullable(),
  sourceAt: z.string().nullable(),
  source: z.string().nullable(),
  rateSetId: z.string().nullable(),
  isStale: z.boolean(),
  period: z
    .object({
      start: z.string(),
      end: z.string(),
      startHijri: z.string(),
      endHijri: z.string(),
      method: z.string(),
    })
    .nullable(),
  lines: z.array(line),
  reasons: z.array(z.string()),
  disclaimer: z.string(),
  valuationDate: civilDate.optional(),
  valuationBasis: z.literal("CURRENT_DECLARED_HOLDINGS").optional(),
  fingerprint: z.string(),
});
export const paymentInput = z
  .object({
    zakatYearId: z.uuid().optional(),
    snapshotFingerprint: z.string().length(64).optional(),
    amount: positiveMoney,
    currency,
    paidOn: civilDate,
    note: z.string().max(500).optional(),
    confirmOverpayment: z.boolean().default(false),
  })
  .strict();
export const correctionInput = z
  .object({
    replacementAmount: money,
    reason: z.string().trim().min(1).max(500),
    lastCorrectionId: z.uuid().nullable(),
    confirmOverpayment: z.boolean().default(false),
  })
  .strict();
export const correctionView = z.object({
  id: z.uuid(),
  replacementAmount: z.string(),
  reason: z.string(),
  createdAt: z.string(),
});
export const paymentView = z.object({
  id: z.string(),
  zakatYearId: z.string(),
  amount: z.string(),
  currency: z.string(),
  paidOn: z.string(),
  createdAt: z.string(),
  note: z.string().nullable(),
  effectiveAmount: z.string(),
  corrections: z.array(correctionView),
});
export const historyView = z.object({
  id: z.string(),
  currency: z.string(),
  assessedAmount: z.string(),
  recordedAmount: z.string(),
  paymentState: z.enum(["UNPAID", "PARTIAL", "RECORDED", "OVER_RECORDED"]),
  remainingAmount: z.string(),
  recordStatus: z.enum(["PAID_PARTIAL", "PAID_RECORDED", "OVER_RECORDED"]),
  createdAt: z.string(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
});
