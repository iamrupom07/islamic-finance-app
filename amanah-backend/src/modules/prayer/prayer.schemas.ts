import { z } from "zod";
import { civilDate } from "../../platform/http/schemas.js";
export const prayerTime = z.object({
  name: z.enum(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]),
  at: z.string(),
  label: z.string(),
});
export const prayerWindow = z.object({
  name: z.string(),
  start: z.string(),
  end: z.string(),
  preferredUntil: z.string().nullable(),
  lateFrom: z.string().nullable(),
  jamaatAt: z.string().nullable(),
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
  solarEvents: z
    .object({ sunriseAt: z.string(), sunsetAt: z.string() })
    .nullable()
    .default(null),
  disclaimer: z.string(),
  windows: z.array(prayerWindow).default([]),
  previousNightIsha: prayerWindow.nullable().default(null),
  forbiddenIntervals: z
    .array(
      z.object({
        name: z.string(),
        start: z.string(),
        end: z.string(),
        explanation: z.string(),
      }),
    )
    .default([]),
  guidanceUnavailableReason: z
    .string()
    .nullable()
    .default("Reviewed prayer interval policy is not installed."),
  policy: z
    .object({
      version: z.string(),
      source: z.string(),
      reviewedBy: z.string(),
      approvedAt: z.string(),
      explanation: z.string(),
      voluntaryPrayerExplanation: z.string(),
    })
    .nullable()
    .default(null),
  nextDayFajr: prayerTime.nullable().default(null),
});
export const prayerQuery = z.object({ date: civilDate.optional() });
