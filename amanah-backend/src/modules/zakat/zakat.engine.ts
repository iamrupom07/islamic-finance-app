import {
  D,
  amount,
  metalValue,
  troyOzGrams,
} from "../../platform/money/decimal.js";
import {
  fxFromSet,
  freshRate,
  type RateData,
} from "../../platform/money/rates.js";
import type {
  Asset,
  Debt,
  UserPreference,
  ZakatPolicyVersion,
} from "@prisma/client";
import { z } from "zod";
import { rules, zakatSummary } from "./zakat.schemas.js";
import { hijriAnniversary } from "./hijri.js";
import { digest } from "../../platform/http/idempotency.js";
export const disclaimer =
  "This is an estimate from declared holdings and the selected reviewed policy, not a religious ruling. Confirm your circumstances with a qualified Islamic finance advisor. No money moves through Amanah.";
export function calculateZakat(input: {
  preference: UserPreference;
  policy: ZakatPolicyVersion | null;
  assets: Asset[];
  debts: Debt[];
  rates: RateData;
  now: Date;
  localDate: string;
  maxAgeHours: number;
}) {
  const {
    preference: p,
    policy,
    assets,
    debts,
    rates,
    now,
    maxAgeHours,
    localDate,
  } = input;
  const result: z.infer<typeof zakatSummary> = {
    status: "CALCULATION_UNAVAILABLE",
    currency: p.currency as z.infer<typeof zakatSummary>["currency"],
    estimate: null,
    netEligibleWealth: null,
    eligibleAssets: null,
    eligibleReceivables: null,
    eligibleLiabilities: null,
    nisabValue: null,
    nisabStandard: p.nisabStandard as "GOLD" | "SILVER",
    nisabGrams: null,
    annualRate: null,
    policyVersion: policy?.version ?? null,
    policyId: policy?.id ?? null,
    sourceAt: rates?.quotedAt.toISOString() ?? null,
    source: rates?.provider ?? null,
    rateSetId: rates?.id ?? null,
    isStale: !freshRate(rates, now, maxAgeHours),
    period: null,
    lines: [],
    reasons: [],
    disclaimer,
    valuationDate: localDate,
    valuationBasis: "CURRENT_DECLARED_HOLDINGS",
    fingerprint: "",
  };
  const finish = () => {
    result.fingerprint = digest(JSON.stringify({ ...result, fingerprint: "" }));
    return result;
  };
  if (
    !policy ||
    policy.status !== "APPROVED" ||
    !policy.reviewedBy ||
    !policy.approvedAt
  ) {
    result.reasons.push(
      "A qualified reviewer must approve and select a calculation policy.",
    );
    return finish();
  }
  const parsed = rules.safeParse(policy.rules);
  if (
    !parsed.success ||
    new D(policy.annualRate.toString()).lte(0) ||
    new D(policy.annualRate.toString()).gt(1)
  ) {
    result.reasons.push("The policy configuration is incomplete.");
    return finish();
  }
  const policyRules = parsed.data;
  result.policyDetails = {
    sourceNotes: policy.sourceNotes ?? null,
    reviewedBy: policy.reviewedBy!,
    approvedAt: policy.approvedAt!.toISOString(),
    goldGrams: policy.goldGrams.toString(),
    silverGrams: policy.silverGrams.toString(),
    rules: policyRules,
  };
  result.nisabGrams = (
    p.nisabStandard === "GOLD" ? policy.goldGrams : policy.silverGrams
  ).toString();
  result.annualRate = policy.annualRate.toString();
  if (p.hijriAnchor) {
    try {
      result.period = hijriAnniversary(p.hijriAnchor);
    } catch {
      result.reasons.push("Confirm a valid Hijri anniversary.");
      return finish();
    }
  }
  if (
    !assets.length &&
    !debts.some((d) => d.direction === "OWED_TO_ME" && d.status === "OPEN")
  ) {
    result.status = "NO_ASSETS";
    result.reasons.push("Declare your current holdings first.");
    return finish();
  }
  if (!rates || rates.quotedAt > now) {
    result.reasons.push("Market quotes are unavailable.");
    return finish();
  }
  const selected = rates.metals.find(
    (m) => m.metal === (p.nisabStandard === "GOLD" ? "XAU" : "XAG"),
  );
  if (!selected || new D(selected.usdPerTroyOz.toString()).lte(0)) {
    result.reasons.push("The selected nisab metal quote is unavailable.");
    return finish();
  }
  let assetTotal = new D(0),
    receivableTotal = new D(0),
    liabilityTotal = new D(0);
  const convert = (v: string, currency: string) =>
    fxFromSet(rates, v, currency, p.currency);
  try {
    result.nisabQuote = {
      usdPerTroyOz: selected.usdPerTroyOz.toString(),
      fxRateApplied: convert("1", "USD").toString(),
      troyOunceGrams: troyOzGrams.toString(),
    };
    const nisab = convert(
      new D(result.nisabGrams)
        .mul(selected.usdPerTroyOz.toString())
        .div(troyOzGrams)
        .toString(),
      "USD",
    );
    for (const a of assets) {
      const included = policyRules.assetTypes.includes(
        a.type as z.infer<typeof rules>["assetTypes"][number],
      );
      if (
        included &&
        a.valuationMode === "MANUAL" &&
        now.getTime() - a.valuedOn.getTime() > 90 * 86400000
      )
        result.reasons.push(
          `Review the declared valuation for ${a.label}; it is over 90 days old.`,
        );
      let raw = a.declaredValue?.toString() ?? null;
      let sourceAt = a.valuedOn.toISOString();
      let originalCurrency = a.currency;
      let metalUsdPerTroyOz: string | null = null;
      if (a.valuationMode === "METAL_RATE") {
        const quote = rates.metals.find(
          (m) => m.metal === (a.type === "GOLD" ? "XAU" : "XAG"),
        );
        if (included && (!quote || !a.weightGrams || !a.purity))
          throw Error("Missing metal valuation.");
        if (quote && a.weightGrams && a.purity) {
          metalUsdPerTroyOz = quote.usdPerTroyOz.toString();
          raw = metalValue(
            a.weightGrams.toString(),
            a.purity.toString(),
            quote.usdPerTroyOz.toString(),
            "1",
          ).toString();
          originalCurrency = "USD";
          sourceAt = quote.quotedAt.toISOString();
        }
      }
      const converted =
        included && raw !== null ? convert(raw, originalCurrency) : null;
      if (included && !converted) throw Error();
      if (converted) assetTotal = assetTotal.add(converted);
      result.lines.push({
        id: a.id,
        weightGrams: a.weightGrams?.toString() ?? null,
        purity: a.purity?.toString() ?? null,
        metalUsdPerTroyOz,
        fxRateApplied: included
          ? convert("1", originalCurrency).toString()
          : null,
        label: a.label,
        kind: "ASSET",
        included,
        reason: included
          ? "Included by selected reviewed policy."
          : "Excluded by selected reviewed policy.",
        originalAmount: raw,
        originalCurrency,
        convertedAmount: converted ? amount(converted) : null,
        valuationMethod: a.valuationMode,
        sourceAt,
      });
    }
    for (const d of debts) {
      const liability = d.direction === "I_OWE";
      const included =
        d.status === "OPEN" &&
        (liability
          ? policyRules.debtRule === "DUE_WITHIN_PERIOD" &&
            !!result.period &&
            !!d.dueOn &&
            d.dueOn.toISOString().slice(0, 10) <= result.period.end
          : policyRules.receivableRule === "RECOVERABLE" &&
            d.recoverability === "RECOVERABLE");
      const converted = included
        ? convert(d.remainingAmount.toString(), d.currency)
        : null;
      if (converted) {
        if (liability) liabilityTotal = liabilityTotal.add(converted);
        else receivableTotal = receivableTotal.add(converted);
      }
      result.lines.push({
        id: d.id,
        fxRateApplied: included ? convert("1", d.currency).toString() : null,
        label: d.label,
        kind: liability ? "LIABILITY" : "RECEIVABLE",
        included,
        reason: included
          ? "Included by selected reviewed policy."
          : "Excluded: status, date or recoverability does not meet this policy.",
        originalAmount: d.remainingAmount.toString(),
        originalCurrency: d.currency,
        convertedAmount: converted ? amount(converted) : null,
        valuationMethod: "DECLARED_REMAINING",
        sourceAt: d.updatedAt.toISOString(),
      });
    }
    const wealth = D.max(
      0,
      assetTotal.add(receivableTotal).sub(liabilityTotal),
    );
    const above = wealth.gte(nisab);
    result.estimate = amount(
      above ? wealth.mul(policy.annualRate.toString()) : 0,
    );
    result.netEligibleWealth = amount(wealth);
    result.nisabValue = amount(nisab);
    result.eligibleAssets = amount(assetTotal);
    result.eligibleReceivables = amount(receivableTotal);
    result.eligibleLiabilities = amount(liabilityTotal);
    result.status = result.isStale
      ? "DATA_STALE"
      : !above
        ? "BELOW_NISAB"
        : !result.period
          ? "ESTIMATE_ONLY"
          : localDate < result.period.start
            ? "ESTIMATE_ONLY"
            : localDate < result.period.end
              ? "YEAR_IN_PROGRESS"
              : p.continuityConfirmed
                ? "POTENTIALLY_DUE"
                : "ESTIMATE_ONLY";
    if (!p.continuityConfirmed)
      result.reasons.push(
        "Continuity above nisab has not been confirmed for this period.",
      );
    if (result.isStale)
      result.reasons.push(
        "Based on stale rates. Recording a new assessment is blocked until fresh data is available.",
      );
    if (result.period && localDate >= result.period.end)
      result.reasons.push(
        "The estimate values current declared holdings at the displayed valuation date; it does not reconstruct wealth on the past anniversary. The declared period has ended. Confirm ongoing conditions with an advisor; no subsequent year is created automatically.",
      );
  } catch {
    result.status = "CALCULATION_UNAVAILABLE";
    result.estimate = null;
    result.reasons.push(
      "One or more asset valuations or currency quotes are missing.",
    );
  }
  return finish();
}
