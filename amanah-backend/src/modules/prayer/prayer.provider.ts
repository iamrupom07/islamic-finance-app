import { z } from "zod";
import { DateTime } from "luxon";
import { ProviderHttp } from "../../platform/providers/http.js";
import type { cities } from "../catalog/catalog.service.js";
import { prayerSchedule } from "./prayer.schemas.js";
const response = z.object({
  code: z.literal(200),
  data: z.object({
    timings: z.record(z.string(), z.string()),
    date: z.object({
      gregorian: z.object({ date: z.string() }),
      hijri: z.object({ date: z.string() }),
    }),
    meta: z.object({
      timezone: z.string(),
      method: z.object({ id: z.number() }),
    }),
  }),
});
export class PrayerProvider {
  constructor(private http: ProviderHttp) {}
  async fetch(
    city: (typeof cities)[number],
    date: string,
    methodId: number,
    school: number,
    now: Date,
  ) {
    const requested = DateTime.fromISO(date, { zone: city.timezone });
    const query = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      method: String(methodId),
      school: String(school),
      timezonestring: city.timezone,
    });
    const r = response.parse(
      await this.http.json(
        `https://api.aladhan.com/v1/timings/${requested.toFormat("dd-MM-yyyy")}?${query}`,
      ),
    );
    if (
      r.data.date.gregorian.date !== requested.toFormat("dd-MM-yyyy") ||
      r.data.meta.timezone !== city.timezone ||
      r.data.meta.method.id !== methodId
    )
      throw new Error("PRAYER_SOURCE_MISMATCH");
    const timings = (
      ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const
    ).map((name) => {
      const raw = r.data.timings[name];
      if (!raw || !/^([01]\d|2[0-3]):[0-5]\d(?:\s|$)/.test(raw))
        throw new Error("PRAYER_TIME_INVALID");
      const label = raw.slice(0, 5);
      const at = DateTime.fromISO(`${date}T${label}`, { zone: city.timezone });
      if (!at.isValid) throw new Error("PRAYER_TIME_INVALID");
      return { name, at: at.toISO()!, label };
    });
    if (timings.some((t, i) => i > 0 && t.at <= timings[i - 1]!.at))
      throw new Error("PRAYER_ORDER_INVALID");
    const sunsetRaw = r.data.timings.Sunset;
    if (!sunsetRaw || !/^([01]\d|2[0-3]):[0-5]\d(?:\s|$)/.test(sunsetRaw))
      throw Error("PRAYER_SOLAR_EVENT_INVALID");
    const sunsetAt = DateTime.fromISO(`${date}T${sunsetRaw.slice(0, 5)}`, {
      zone: city.timezone,
    }).toISO()!;
    if (sunsetAt <= timings[3]!.at || sunsetAt > timings[4]!.at)
      throw Error("PRAYER_SOLAR_ORDER_INVALID");
    return prayerSchedule.parse({
      solarEvents: { sunriseAt: timings[1]!.at, sunsetAt },
      date,
      cityId: city.id,
      city: city.name,
      timezone: city.timezone,
      methodId,
      school,
      timings,
      hijriDate: r.data.date.hijri.date,
      source: "aladhan",
      asOf: now.toISOString(),
      expiresAt: requested.plus({ days: 1 }).startOf("day").toISO(),
      isStale: false,
      nextPrayer: null,
      disclaimer:
        "Calculated times can differ from your local mosque. Hijri dates are source-reported and may differ from local moon sightings.",
    });
  }
}
