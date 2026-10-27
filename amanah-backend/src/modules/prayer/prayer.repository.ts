import type { Prisma } from "@prisma/client";
import type { Database } from "../../platform/database/client.js";
export class PrayerRepository {
  constructor(private db: Database) {}
  get(key: string) {
    return this.db.prayerScheduleCache.findUnique({ where: { key } });
  }
  put(key: string, schedule: Prisma.InputJsonValue, expiresAt: Date) {
    return this.db.prayerScheduleCache.upsert({
      where: { key },
      create: { key, schedule, expiresAt },
      update: { schedule, expiresAt, fetchedAt: new Date() },
    });
  }
  preference(userId: string) {
    return this.db.userPreference.findUniqueOrThrow({ where: { userId } });
  }
}
