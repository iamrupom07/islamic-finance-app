import { Decimal } from "decimal.js";
export const D = Decimal.clone({
  precision: 48,
  rounding: Decimal.ROUND_HALF_UP,
});
export const amount = (v: Decimal.Value) => new D(v).toFixed(2);
export const troyOzGrams = new D("31.1034768");
export function convert(value: string, fromPerUsd: string, toPerUsd: string) {
  if (new D(fromPerUsd).lte(0) || new D(toPerUsd).lte(0))
    throw new Error("INVALID_RATE");
  return new D(value).div(fromPerUsd).mul(toPerUsd);
}
export const metalValue = (
  weight: string,
  purity: string,
  usdPerOz: string,
  perUsd: string,
) => new D(weight).mul(purity).mul(usdPerOz).div(troyOzGrams).mul(perUsd);
