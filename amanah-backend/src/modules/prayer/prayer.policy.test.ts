import { describe, it, expect } from "vitest";
import { derivePrayerWindows, reviewedPrayerPolicy } from "./prayer.policy.js";
import { prayerSchedule } from "./prayer.schemas.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrayerService } from "./prayer.service.js";
import type { Context } from "../../platform/context.js";
import type { PrayerProvider } from "./prayer.provider.js";
// Fictional offsets exercise the software only; not a deployable religious policy.
const policy = reviewedPrayerPolicy.parse({
  approved: true,
  version: "TEST_ONLY",
  reviewedBy: "SOFTWARE FIXTURE",
  approvedAt: "2026-10-25T00:00:00Z",
  source: "https://example.test/policy",
  cityIds: ["dhaka"],
  methodIds: [1],
  schools: [1],
  sunriseEndsAfterMinutes: 20,
  zenithStartsBeforeDhuhrMinutes: 5,
  sunsetStartsBeforeMinutes: 20,
  ishaEnd: "NEXT_FAJR",
  ishaPreferredUntil: "FIRST_THIRD",
  explanation: "Test-only interval criteria",
  voluntaryPrayerExplanation: "Test-only explanation",
});

it("retains the approved previous Isha after midnight and revalidates its cache through Fajr", async () => {
  const directory = mkdtempSync(join(tmpdir(), "amanah-prayer-test-"));
  try {
    const path = join(directory, "policy.json");
    writeFileSync(path, JSON.stringify(policy));
    const cached = new Map<string, unknown>();
    const fetched: string[] = [];
    const ctx = {
      env: { PRAYER_POLICY_PATH: path },
      now: () => new Date("2026-10-27T00:30:00+06:00"),
      cache: {
        get: async (key: string) => cached.get(key) ?? null,
        set: async (key: string, value: unknown) => {
          cached.set(key, value);
        },
      },
      db: {
        userPreference: {
          findUniqueOrThrow: async () => ({
            cityId: "dhaka",
            timezone: "Asia/Dhaka",
            methodId: 1,
            school: 1,
          }),
        },
        prayerScheduleCache: {
          findUnique: async () => null,
          upsert: async () => ({}),
        },
      },
    } as unknown as Context;
    const provider = {
      fetch: async (_city: unknown, date: string) => {
        fetched.push(date);
        const schedule = day(date);
        schedule.asOf = ctx.now().toISOString();
        return schedule;
      },
    } as unknown as PrayerProvider;
    const service = new PrayerService(ctx, provider);
    const response = await service.today("test-user");
    expect(response.previousNightIsha?.start).toContain("2026-10-26T19:15:");
    expect(response.previousNightIsha?.end).toContain("2026-10-27T05:00:");
    await service.today("test-user");
    expect(fetched.filter((d) => d === "2026-10-26")).toHaveLength(1);
    writeFileSync(
      path,
      JSON.stringify({ ...policy, ishaEnd: "ISLAMIC_MIDNIGHT" }),
    );
    expect(
      (await new PrayerService(ctx, provider).today("test-user"))
        .previousNightIsha,
    ).toBeNull();
    cached.clear();
    const unavailable = {
      fetch: async (_city: unknown, date: string) => {
        if (date === "2026-10-26") throw Error("SOURCE_UNAVAILABLE");
        return day(date);
      },
    } as unknown as PrayerProvider;
    expect(
      (await new PrayerService(ctx, unavailable).today("test-user"))
        .previousNightIsha,
    ).toBeNull();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
const day = (date: string) =>
  prayerSchedule.parse({
    date,
    solarEvents: {
      sunriseAt: `${date}T06:00:00+06:00`,
      sunsetAt: `${date}T18:00:00+06:00`,
    },
    cityId: "dhaka",
    city: "Dhaka",
    timezone: "Asia/Dhaka",
    methodId: 1,
    school: 1,
    timings: Object.entries({
      Fajr: "05:00",
      Sunrise: "06:00",
      Dhuhr: "12:00",
      Asr: "15:00",
      Maghrib: "18:00",
      Isha: "19:15",
    }).map(([name, time]) => ({
      name,
      at: `${date}T${time}:00+06:00`,
      label: time,
    })),
    hijriDate: "FIXTURE",
    source: "aladhan",
    asOf: `${date}T00:00:00Z`,
    expiresAt: `${date}T23:59:59Z`,
    isStale: false,
    nextPrayer: null,
    disclaimer: "Test",
  });
describe("reviewed prayer windows", () => {
  it("does not publish unreviewed guidance", () =>
    expect(
      derivePrayerWindows(day("2026-10-26"), day("2026-10-27"), null).windows,
    ).toEqual([]));
  it("constructs five ranges and three explicit intervals including next-day Fajr", () => {
    const r = derivePrayerWindows(day("2026-10-26"), day("2026-10-27"), policy);
    expect(r.windows).toHaveLength(5);
    expect(r.forbiddenIntervals).toHaveLength(3);
    expect(r.windows[0]!.end).toContain("T06:00:");
    expect(r.windows[4]!.end).toContain("2026-10-27T05:00:");
    expect(r.forbiddenIntervals[1]!.start).toContain("T11:55:");
    expect(r.windows[4]!.preferredUntil).toBeTruthy();
  });
  it("does not apply a policy to an uncovered Asr convention", () =>
    expect(
      derivePrayerWindows(
        { ...day("2026-10-26"), school: 0 },
        day("2026-10-27"),
        policy,
      ).windows,
    ).toEqual([]));
  it("rejects unavailable or stale next-day events", () => {
    expect(
      derivePrayerWindows(day("2026-10-26"), null, policy).windows,
    ).toEqual([]);
    expect(
      derivePrayerWindows(
        day("2026-10-26"),
        { ...day("2026-10-27"), isStale: true },
        policy,
      ).windows,
    ).toEqual([]);
  });
  it("supports a separately reviewed midnight end", () => {
    const r = derivePrayerWindows(day("2026-10-26"), day("2026-10-27"), {
      ...policy,
      ishaEnd: "ISLAMIC_MIDNIGHT",
    });
    expect(r.windows[4]!.end).toContain("T23:30:");
  });
  it("refuses an approved:false template", () =>
    expect(() =>
      reviewedPrayerPolicy.parse({ ...policy, approved: false }),
    ).toThrow());
  it("suppresses ranges for invalid or inconsistent solar events", () => {
    for (const sunsetAt of [
      "invalid",
      "2026-10-26T12:00:00+06:00",
      "2026-10-26T20:00:00+06:00",
    ]) {
      const invalid = day("2026-10-26");
      invalid.solarEvents!.sunsetAt = sunsetAt;
      expect(
        derivePrayerWindows(invalid, day("2026-10-27"), policy).windows,
      ).toEqual([]);
    }
  });
});
