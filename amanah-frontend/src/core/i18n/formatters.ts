import { Decimal } from "decimal.js";
export function formatMoney(
  value: string | null | undefined,
  currency = "BDT",
  locale = "en",
) {
  if (value == null) return "—";
  if (!/^-?\d+(\.\d+)?$/.test(value)) return "—";
  const fixed = new Decimal(value).toFixed(2);
  const [integer = "0", fraction = "00"] = fixed.split(".");
  const groups = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const symbols: Record<string, string> = {
    BDT: "৳",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const text = `${symbols[currency] ?? currency + " "}${groups}.${fraction}`;
  return locale === "bn"
    ? text.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]!)
    : text;
}
export const localDate = (timezone = "Asia/Dhaka") => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};
export const monthNow = (timezone = "Asia/Dhaka") =>
  localDate(timezone).slice(0, 7);
