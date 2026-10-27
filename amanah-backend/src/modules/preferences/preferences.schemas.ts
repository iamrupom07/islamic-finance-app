import { z } from "zod";
import { currency, version } from "../../platform/http/schemas.js";
export const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export const reminderSettings = z.object({
  prayers: z.array(z.enum(prayerNames)).max(5).default([]),
  anniversaryDays: z
    .array(z.union([z.literal(1), z.literal(7), z.literal(30)]))
    .max(3)
    .default([]),
  weeklySummary: z.boolean().default(false),
});
export const preferenceView = z.object({
  currency,
  locale: z.enum(["en", "bn"]),
  appearance: z.enum(["light", "dark", "system"]),
  cityId: z.string(),
  timezone: z.string(),
  methodId: z.number(),
  school: z.number(),
  nisabStandard: z.enum(["SILVER", "GOLD"]),
  policyVersionId: z.string().nullable(),
  hijriAnchor: z.string().nullable(),
  continuityConfirmed: z.boolean(),
  reminders: reminderSettings,
  setupStep: z.number(),
  setupCompletedAt: z.string().nullable(),
  version,
});
export const preferenceInput = z
  .object({
    version,
    currency: currency.optional(),
    locale: z.enum(["en", "bn"]).optional(),
    appearance: z.enum(["light", "dark", "system"]).optional(),
    cityId: z.string().max(32).optional(),
    methodId: z.number().int().optional(),
    school: z.union([z.literal(0), z.literal(1)]).optional(),
    nisabStandard: z.enum(["SILVER", "GOLD"]).optional(),
    policyVersionId: z.uuid().optional(),
    hijriAnchor: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    continuityConfirmed: z.boolean().optional(),
    reminders: reminderSettings.optional(),
    setupStep: z.number().int().min(0).max(3).optional(),
    completeSetup: z.boolean().optional(),
  })
  .strict();
