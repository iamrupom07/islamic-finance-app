import { Decimal } from "decimal.js";
const D = Decimal.clone({ precision: 48, rounding: Decimal.ROUND_HALF_UP });
export const weightFactors = {
  g: "1",
  bhori: "11.664",
  tola: "11.6638038",
  ozt: "31.1034768",
} as const;
export type WeightUnit = keyof typeof weightFactors;
export function grams(value: string, unit: WeightUnit) {
  return new D(value).mul(weightFactors[unit]).toFixed(6);
}
export function changeWeightUnit(
  value: string,
  from: WeightUnit,
  to: WeightUnit,
) {
  if (!value) return "";
  return new D(value)
    .mul(weightFactors[from])
    .div(weightFactors[to])
    .toDecimalPlaces(12)
    .toString();
}
export function metalPreview(
  weight: string,
  unit: WeightUnit,
  purity: string,
  perGram: string | null,
) {
  try {
    return perGram
      ? new D(grams(weight, unit)).mul(purity).mul(perGram).toFixed(2)
      : null;
  } catch {
    return null;
  }
}
export function shiftMonth(month: string, delta: number) {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) return month;
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
export function percent(part: string, total: string) {
  try {
    return new D(total).gt(0)
      ? D.min(100, D.max(0, new D(part).div(total).mul(100))).toNumber()
      : 0;
  } catch {
    return 0;
  }
}
export function periodProgress(start: string, end: string, today: string) {
  const a = Date.parse(start),
    b = Date.parse(end),
    c = Date.parse(today);
  if (!Number.isFinite(a + b + c) || b <= a) return null;
  return {
    daysRemaining: Math.max(0, Math.ceil((b - c) / 86400000)),
    daysElapsed: Math.max(
      0,
      Math.min(Math.floor((c - a) / 86400000), Math.round((b - a) / 86400000)),
    ),
    totalDays: Math.round((b - a) / 86400000),
  };
}
