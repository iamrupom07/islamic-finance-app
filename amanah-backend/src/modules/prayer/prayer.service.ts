import { derivePrayerWindows, loadPrayerPolicy } from "./prayer.policy.js";
import { DateTime } from "luxon";
import type { Context } from "../../platform/context.js";
import { cities } from "../catalog/catalog.service.js";
import { ProviderHttp } from "../../platform/providers/http.js";
import { AppError, unavailable } from "../../platform/http/errors.js";
import { PrayerProvider } from "./prayer.provider.js";
import { PrayerRepository } from "./prayer.repository.js";
import { prayerSchedule } from "./prayer.schemas.js";
export class PrayerService {
  private repo: PrayerRepository;
  private provider: PrayerProvider;
  private policy: ReturnType<typeof loadPrayerPolicy>;
  constructor(
    private ctx: Context,
    provider?: PrayerProvider,
  ) {
    this.repo = new PrayerRepository(ctx.db);
    this.policy = loadPrayerPolicy(ctx.env.PRAYER_POLICY_PATH);
    if (this.policy && new Date(this.policy.approvedAt) > ctx.now())
      throw Error("PRAYER_POLICY_APPROVAL_IN_FUTURE");
    this.provider =
      provider ??
      new PrayerProvider(new ProviderHttp(ctx.env.PROVIDER_TIMEOUT_MS));
  }
  async today(uid: string, date?: string) {
    const day = await this.day(uid, date);
    let tomorrow = null;
    try {
      tomorrow = await this.day(
        uid,
        DateTime.fromISO(day.date, { zone: day.timezone })
          .plus({ days: 1 })
          .toISODate()!,
      );
    } catch {
      /* Retain verified current-day starting times. */
    }
    const nextDayFajr =
      tomorrow?.timings.find((t) => t.name === "Fajr") ?? null;
    let previousNightIsha = null;
    const currentFajr = day.timings.find((t) => t.name === "Fajr");
    if (
      this.policy &&
      currentFajr &&
      day.date ===
        DateTime.fromJSDate(this.ctx.now()).setZone(day.timezone).toISODate() &&
      this.ctx.now() < new Date(currentFajr.at)
    ) {
      try {
        const previous = await this.day(
          uid,
          DateTime.fromISO(day.date, { zone: day.timezone })
            .minus({ days: 1 })
            .toISODate()!,
          currentFajr.at,
        );
        previousNightIsha =
          derivePrayerWindows(previous, day, this.policy).windows.find(
            (w) =>
              w.name === "Isha" &&
              new Date(w.start) <= this.ctx.now() &&
              this.ctx.now() < new Date(w.end),
          ) ?? null;
      } catch {
        /* Never infer an unavailable previous-night boundary. */
      }
    }
    return {
      ...day,
      ...derivePrayerWindows(day, tomorrow, this.policy),
      nextDayFajr,
      previousNightIsha,
      nextPrayer:
        [...day.timings, ...(nextDayFajr ? [nextDayFajr] : [])].find(
          (t) => t.name !== "Sunrise" && new Date(t.at) > this.ctx.now(),
        ) ?? null,
    };
  }
  private async day(uid: string, date?: string, nightExpiresAt?: string) {
    const p = await this.repo.preference(uid);
    const city = cities.find((c) => c.id === p.cityId);
    if (!city) throw unavailable("Choose a supported prayer city.");
    const local = DateTime.fromJSDate(this.ctx.now()).setZone(p.timezone);
    date ??= local.toISODate()!;
    if (
      Math.abs(
        DateTime.fromISO(date, { zone: p.timezone }).diff(
          local.startOf("day"),
          "days",
        ).days,
      ) > 31
    )
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Request a date within 31 days.",
      );
    const key = `prayer:v2:${city.id}:${date}:${p.methodId}:${p.school}:${p.timezone}`;
    let schedule = prayerSchedule.safeParse(await this.ctx.cache.get(key));
    const stored = schedule.success ? null : await this.repo.get(key);
    if (!schedule.success && stored)
      schedule = prayerSchedule.safeParse(stored.schedule);
    if (
      !schedule.success ||
      new Date(schedule.data.expiresAt) < this.ctx.now()
    ) {
      try {
        const next = await this.provider.fetch(
          city,
          date,
          p.methodId,
          p.school,
          this.ctx.now(),
        );
        // The previous night's timetable remains useful across civil midnight.
        // Extend only a successfully revalidated source, through today's Fajr.
        if (
          nightExpiresAt &&
          new Date(nightExpiresAt) > new Date(next.expiresAt)
        )
          next.expiresAt = nightExpiresAt;
        await this.repo.put(key, next, new Date(next.expiresAt));
        await this.ctx.cache.set(
          key,
          next,
          Math.max(
            1,
            Math.floor(
              (new Date(next.expiresAt).getTime() - this.ctx.now().getTime()) /
                1000,
            ),
          ),
        );
        schedule = prayerSchedule.safeParse(next);
      } catch {
        if (!schedule.success)
          throw unavailable(
            "Prayer times could not be retrieved. Try again later.",
          );
      }
    }
    if (!schedule.success) throw unavailable();
    const result = schedule.data;
    if (
      result.date !== date ||
      result.cityId !== p.cityId ||
      result.methodId !== p.methodId ||
      result.school !== p.school ||
      result.timezone !== p.timezone
    )
      throw unavailable();
    return {
      ...result,
      isStale: new Date(result.expiresAt) < this.ctx.now(),
      nextPrayer:
        result.timings.find(
          (t) => t.name !== "Sunrise" && new Date(t.at) > this.ctx.now(),
        ) ?? null,
    };
  }
}
