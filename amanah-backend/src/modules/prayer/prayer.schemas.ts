import { z } from "zod";
import { civilDate } from "../../platform/http/schemas.js";
export const prayerTime = z.object({
  name: z.enum(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]),
  at: z.string(),
  label: z.string(),
});
export const prayerSchedule = z.object({
  date: civilDate,
  cityId: z.string(),
  city: z.string(),
  timezone: z.string(),
  methodId: z.number(),
  school: z.number(),
  timings: z.array(prayerTime),
  hijriDate: z.string(),
  source: z.literal("aladhan"),
  asOf: z.string(),
  expiresAt: z.string(),
  isStale: z.boolean(),
  nextPrayer: prayerTime.nullable(),
  disclaimer: z.string(),
});
export const prayerQuery = z.object({ date: civilDate.optional() });
