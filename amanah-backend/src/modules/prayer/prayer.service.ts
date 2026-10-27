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
  constructor(
    private ctx: Context,
    provider?: PrayerProvider,
  ) {
    this.repo = new PrayerRepository(ctx.db);
    this.provider =
      provider ??
      new PrayerProvider(new ProviderHttp(ctx.env.PROVIDER_TIMEOUT_MS));
  }
  async today(uid: string, date?: string) {
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
    const key = `prayer:v1:${city.id}:${date}:${p.methodId}:${p.school}:${p.timezone}`;
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
