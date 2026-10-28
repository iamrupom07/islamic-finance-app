import {
  grams,
  changeWeightUnit,
  metalPreview,
  shiftMonth,
  percent,
  periodProgress,
} from "../src/features/finance/value-tools";
it("normalizes troy ounces and Bangladesh bhori to persisted micrograms", () => {
  expect(grams("1", "ozt")).toBe("31.103477");
  expect(grams("1", "bhori")).toBe("11.664000");
  expect(grams("1", "tola")).toBe("11.663804");
});
it("unit changes preserve the underlying mass on round trip", () => {
  const ounce = changeWeightUnit("20", "g", "ozt");
  expect(grams(ounce, "ozt")).toBe("20.000000");
  expect(changeWeightUnit("", "g", "bhori")).toBe("");
});
it("preview applies selected currency's pure-metal reference and purity", () => {
  expect(metalPreview("10", "g", "0.75", "100")).toBe("750.00");
  expect(metalPreview("1", "bhori", "1", "100")).toBe("1166.40");
  expect(metalPreview("10", "g", "1", null)).toBeNull();
  expect(metalPreview("bad", "g", "1", "100")).toBeNull();
});
it("month navigation crosses years without fixed sample months", () => {
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
});
it("does not invent a minimum percentage", () => {
  expect(percent("1", "100")).toBe(1);
  expect(percent("0", "100")).toBe(0);
  expect(percent("1", "0")).toBe(0);
});
it("uses actual period length and clamps progress", () => {
  expect(periodProgress("2026-01-01", "2026-12-21", "2026-01-11")).toEqual({
    daysElapsed: 10,
    daysRemaining: 344,
    totalDays: 354,
  });
  expect(
    periodProgress("2026-01-01", "2026-12-21", "2027-01-01")?.daysRemaining,
  ).toBe(0);
});
