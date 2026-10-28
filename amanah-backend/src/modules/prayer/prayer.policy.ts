import { readFileSync } from "node:fs";
import { z } from "zod";
import { DateTime } from "luxon";
import type { prayerSchedule } from "./prayer.schemas.js";
export const reviewedPrayerPolicy = z
  .object({
    approved: z.literal(true),
    version: z.string().min(1),
    reviewedBy: z.string().min(1),
    approvedAt: z.iso.datetime(),
    source: z.url().startsWith("https://"),
    cityIds: z.array(z.string()).min(1),
    methodIds: z.array(z.number().int()).min(1),
    schools: z.array(z.union([z.literal(0), z.literal(1)])).min(1),
    sunriseEndsAfterMinutes: z.number().int().min(1).max(60),
    zenithStartsBeforeDhuhrMinutes: z.number().int().min(1).max(30),
    sunsetStartsBeforeMinutes: z.number().int().min(1).max(60),
    ishaEnd: z.enum(["NEXT_FAJR", "ISLAMIC_MIDNIGHT"]),
    ishaPreferredUntil: z.enum(["FIRST_THIRD", "ISLAMIC_MIDNIGHT"]),
    explanation: z.string().min(1),
    voluntaryPrayerExplanation: z.string().min(1),
  })
  .strict();
export type ReviewedPrayerPolicy = z.infer<typeof reviewedPrayerPolicy>;
export function loadPrayerPolicy(path?: string) {
  return path
    ? reviewedPrayerPolicy.parse(JSON.parse(readFileSync(path, "utf8")))
    : null;
}
export function derivePrayerWindows(
  day: z.infer<typeof prayerSchedule>,
  tomorrow: z.infer<typeof prayerSchedule> | null,
  policy: ReviewedPrayerPolicy | null,
) {
  const unavailable = (reason: string) => ({
    windows: [],
    forbiddenIntervals: [],
    guidanceUnavailableReason: reason,
    policy: null,
  });
  if (!policy)
    return unavailable(
      "Prayer ranges and prohibited intervals need a qualified reviewer-approved policy. Calculated starting times remain available.",
    );
  if (
    !policy.cityIds.includes(day.cityId) ||
    !policy.methodIds.includes(day.methodId) ||
    !policy.schools.some((s) => s === day.school)
  )
    return unavailable(
      "The installed prayer policy does not cover the selected city, method and Asr convention.",
    );
  if (!tomorrow || day.isStale || tomorrow.isStale)
    return unavailable(
      "Fresh current and next-day events are required for reviewed prayer ranges.",
    );
  if (!day.solarEvents)
    return unavailable(
      "Verified sunrise and sunset events are required for prayer ranges.",
    );
  const at = (name: string) =>
    DateTime.fromISO(day.timings.find((t) => t.name === name)?.at ?? "", {
      setZone: true,
    }).setZone(day.timezone);
  const fajr = at("Fajr"),
    sunrise = at("Sunrise"),
    dhuhr = at("Dhuhr"),
    asr = at("Asr"),
    maghrib = at("Maghrib"),
    isha = at("Isha"),
    nextFajr = DateTime.fromISO(
      tomorrow.timings.find((t) => t.name === "Fajr")?.at ?? "",
      { setZone: true },
    ).setZone(day.timezone);
  if (
    [fajr, sunrise, dhuhr, asr, maghrib, isha, nextFajr].some(
      (t) => !t.isValid,
    ) ||
    nextFajr <= isha
  )
    return unavailable("The solar-event sequence cannot support ranges.");
  const sunriseEnd = sunrise.plus({ minutes: policy.sunriseEndsAfterMinutes });
  const zenithStart = dhuhr.minus({
    minutes: policy.zenithStartsBeforeDhuhrMinutes,
  });
  const sunset = DateTime.fromISO(day.solarEvents.sunsetAt, {
    setZone: true,
  }).setZone(day.timezone);
  const sunsetStart = sunset.minus({
    minutes: policy.sunsetStartsBeforeMinutes,
  });
  const midnight = sunset.plus({
    milliseconds: nextFajr.diff(sunset).milliseconds / 2,
  });
  const preferred =
    policy.ishaPreferredUntil === "FIRST_THIRD"
      ? sunset.plus({ milliseconds: nextFajr.diff(sunset).milliseconds / 3 })
      : midnight;
  const ishaEnd = policy.ishaEnd === "NEXT_FAJR" ? nextFajr : midnight;
  if (
    !sunset.isValid ||
    !(
      fajr < sunrise &&
      sunrise < dhuhr &&
      dhuhr < asr &&
      asr < sunset &&
      sunset <= maghrib &&
      maghrib < isha
    ) ||
    sunriseEnd >= zenithStart ||
    zenithStart <= sunrise ||
    sunsetStart <= asr ||
    ishaEnd <= isha ||
    preferred <= isha ||
    preferred > ishaEnd
  )
    return unavailable(
      "Reviewed interval parameters are inconsistent with this day's events.",
    );
  const windows = [
    { name: "Fajr", start: fajr, end: sunrise },
    { name: "Dhuhr", start: dhuhr, end: asr },
    { name: "Asr", start: asr, end: sunset },
    { name: "Maghrib", start: maghrib, end: isha },
    { name: "Isha", start: isha, end: ishaEnd },
  ].map((w) => ({
    name: w.name,
    start: w.start.toISO()!,
    end: w.end.toISO()!,
    preferredUntil: w.name === "Isha" ? preferred.toISO() : null,
    lateFrom: w.name === "Asr" ? sunsetStart.toISO() : null,
    jamaatAt: null,
  }));
  return {
    windows,
    forbiddenIntervals: [
      { name: "Sunrise", start: sunrise.toISO()!, end: sunriseEnd.toISO()! },
      {
        name: "Solar zenith",
        start: zenithStart.toISO()!,
        end: dhuhr.toISO()!,
      },
      { name: "Sunset", start: sunsetStart.toISO()!, end: sunset.toISO()! },
    ].map((w) => ({ ...w, explanation: policy.explanation })),
    guidanceUnavailableReason: null,
    policy: {
      version: policy.version,
      source: policy.source,
      reviewedBy: policy.reviewedBy,
      approvedAt: policy.approvedAt,
      explanation: policy.explanation,
      voluntaryPrayerExplanation: policy.voluntaryPrayerExplanation,
    },
  };
}
