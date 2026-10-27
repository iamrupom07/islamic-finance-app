// Tabular Islamic civil calendar. Local moon sightings can differ; never call this an observed calendar.
import { AppError } from "../../platform/http/errors.js";
const epoch = 1948439.5;
const leap = (y: number) => (11 * y + 14) % 30 < 11;
function toJd(y: number, m: number, d: number) {
  return (
    d +
    Math.ceil(29.5 * (m - 1)) +
    (y - 1) * 354 +
    Math.floor((3 + 11 * y) / 30) +
    epoch -
    1
  );
}
export function hijriAnniversary(anchor: string) {
  const [year = 0, month = 0, day = 0] = anchor.split("-").map(Number);
  const days =
    month === 12 ? (leap(year) ? 30 : 29) : month % 2 === 1 ? 30 : 29;
  if (
    year < 1300 ||
    year > 1700 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days
  )
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Use a valid civil Hijri date.",
    );
  const endDay = Math.min(
    day,
    month === 12 ? (leap(year + 1) ? 30 : 29) : days,
  );
  const iso = (jd: number) =>
    new Date((jd - 2440587.5) * 86400000).toISOString().slice(0, 10);
  return {
    start: iso(toJd(year, month, day)),
    end: iso(toJd(year + 1, month, endDay)),
    startHijri: anchor,
    endHijri: `${year + 1}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
    method: "ISLAMIC_CIVIL_TABULAR",
  };
}
