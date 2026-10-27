import { describe, it, expect } from "vitest";
import { calculateZakat } from "./zakat.engine.js";
import { hijriAnniversary } from "./hijri.js";
import {
  now,
  preference,
  policy,
  rates,
  asset,
  debt,
  decimal,
} from "../../test/fixtures.js";
const run = (changes: any = {}) =>
  calculateZakat({
    preference,
    policy,
    assets: [asset()],
    debts: [],
    rates,
    now,
    localDate: "2026-10-26",
    maxAgeHours: 36,
    ...changes,
  });
describe("deterministic zakat estimates (fictional policy)", () => {
  it("blocks an unapproved policy", () =>
    expect(run({ policy: { ...policy, status: "DRAFT" } }).status).toBe(
      "CALCULATION_UNAVAILABLE",
    ));
  it("does not need prices to explain no assets", () =>
    expect(run({ assets: [], rates: null }).status).toBe("NO_ASSETS"));
  it("detects below threshold", () =>
    expect(
      run({ assets: [asset({ declaredValue: decimal("100") })] }).status,
    ).toBe("BELOW_NISAB"));
  it("distinguishes a year in progress", () =>
    expect(run({ localDate: "2025-10-26" }).status).toBe("YEAR_IN_PROGRESS"));
  it("qualifies only a completed attested year", () =>
    expect(run().status).toBe("POTENTIALLY_DUE"));
  it("does not claim due without continuity", () =>
    expect(
      run({ preference: { ...preference, continuityConfirmed: false } }).status,
    ).toBe("ESTIMATE_ONLY"));
  it("does not claim due without anchor", () =>
    expect(
      run({ preference: { ...preference, hijriAnchor: null } }).status,
    ).toBe("ESTIMATE_ONLY"));
  it("chooses gold rather than silver", () =>
    expect(
      run({ preference: { ...preference, nisabStandard: "GOLD" } }).nisabValue,
    ).toBe("1000000.00"));
  it("blocks missing FX", () =>
    expect(run({ rates: { ...rates, fx: [] } }).status).toBe(
      "CALCULATION_UNAVAILABLE",
    ));
  it("marks stale rates", () =>
    expect(run({ now: new Date("2026-10-29T06:00:00Z") }).status).toBe(
      "DATA_STALE",
    ));
  it("rejects future quotes", () =>
    expect(run({ now: new Date("2026-10-25T06:00:00Z") }).status).toBe(
      "CALCULATION_UNAVAILABLE",
    ));
  it("includes exact threshold equality", () =>
    expect(
      run({ assets: [asset({ declaredValue: decimal("50000") })] }).estimate,
    ).toBe("1250.00"));
  it("compares before rounding", () =>
    expect(
      run({ assets: [asset({ declaredValue: decimal("49999.9999") })] })
        .estimate,
    ).toBe("0.00"));
  it("converts before comparing", () =>
    expect(
      run({
        assets: [asset({ currency: "USD", declaredValue: decimal("1000") })],
      }).estimate,
    ).toBe("2500.00"));
  it("values manual gold once", () =>
    expect(
      run({
        assets: [asset({ type: "GOLD", declaredValue: decimal("100000") })],
      }).eligibleAssets,
    ).toBe("100000.00"));
  it("uses metal grams and purity", () =>
    expect(
      run({
        assets: [
          asset({
            type: "GOLD",
            valuationMode: "METAL_RATE",
            declaredValue: null,
            weightGrams: decimal("20"),
            purity: decimal("0.5"),
          }),
        ],
      }).eligibleAssets,
    ).toBe("100000.00"));
  it("includes recoverable receivables", () =>
    expect(
      run({ debts: [debt({ direction: "OWED_TO_ME" })] }).eligibleReceivables,
    ).toBe("1000.00"));
  it("excludes disputed receivables", () =>
    expect(
      run({
        debts: [debt({ direction: "OWED_TO_ME", recoverability: "DISPUTED" })],
      }).eligibleReceivables,
    ).toBe("0.00"));
  it("deducts policy eligible debt", () =>
    expect(run({ debts: [debt()] }).netEligibleWealth).toBe("99000.00"));
  it("excludes long-term liabilities", () =>
    expect(
      run({ debts: [debt({ dueOn: new Date("2030-01-01") })] })
        .eligibleLiabilities,
    ).toBe("0.00"));
  it("never returns negative eligible wealth", () =>
    expect(
      run({ debts: [debt({ remainingAmount: decimal("200000") })] })
        .netEligibleWealth,
    ).toBe("0.00"));
  it("clamps the leap anniversary day to next year", () =>
    expect(hijriAnniversary("1447-12-30").endHijri).toMatch(/^1448-12-29$/));
  it("rejects invalid civil Hijri dates", () =>
    expect(() => hijriAnniversary("1448-12-30")).toThrow());
  it("keeps a deterministic fingerprint", () => {
    const holding = asset();
    expect(run({ assets: [holding] }).fingerprint).toBe(
      run({ assets: [holding] }).fingerprint,
    );
  });
});
