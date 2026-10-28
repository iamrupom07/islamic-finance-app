import { it, expect } from "vitest";
import { PrayerProvider } from "./prayer.provider.js";
import { ProviderHttp } from "../../platform/providers/http.js";
import { cities } from "../catalog/catalog.service.js";
const payload = {
  code: 200,
  data: {
    timings: {
      Fajr: "04:50",
      Sunrise: "06:00",
      Dhuhr: "12:00",
      Asr: "15:20",
      Maghrib: "17:30",
      Sunset: "17:30",
      Isha: "19:00",
    },
    date: {
      gregorian: { date: "26-10-2026" },
      hijri: { date: "TEST_FIXTURE_DATE" },
    },
    meta: { timezone: "Asia/Dhaka", method: { id: 1 } },
  },
};
it("constructs timezone-aware instants and validates the requested day/method", async () => {
  const p = new PrayerProvider(
    new ProviderHttp(1000, async () => new Response(JSON.stringify(payload))),
  );
  const schedule = await p.fetch(
    cities[0]!,
    "2026-10-26",
    1,
    1,
    new Date("2026-10-26T00:00:00Z"),
  );
  expect(schedule.timings[0]?.at).toContain("+06:00");
  expect(schedule.school).toBe(1);
  expect(schedule.date).toBe("2026-10-26");
});
it("rejects yesterday or an incompatible source method", async () => {
  const p = new PrayerProvider(
    new ProviderHttp(1000, async () => new Response(JSON.stringify(payload))),
  );
  await expect(
    p.fetch(cities[0]!, "2026-10-27", 1, 1, new Date()),
  ).rejects.toThrow("PRAYER_SOURCE_MISMATCH");
  await expect(
    p.fetch(cities[0]!, "2026-10-26", 2, 1, new Date()),
  ).rejects.toThrow("PRAYER_SOURCE_MISMATCH");
});
it("rejects impossible prayer times rather than saving a false schedule", async () => {
  const p = new PrayerProvider(
    new ProviderHttp(
      1000,
      async () =>
        new Response(
          JSON.stringify({
            ...payload,
            data: {
              ...payload.data,
              timings: { ...payload.data.timings, Fajr: "29:99" },
            },
          }),
        ),
    ),
  );
  await expect(
    p.fetch(cities[0]!, "2026-10-26", 1, 1, new Date()),
  ).rejects.toThrow("PRAYER_TIME_INVALID");
});
