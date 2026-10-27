import type { Database } from "../../platform/database/client.js";
export class ReportsRepository {
  constructor(private db: Database) {}
  groups(userId: string, start: Date, end: Date) {
    return this.db.transaction.groupBy({
      by: ["type", "category", "isSadaqah", "reportingCurrency"],
      where: { userId, deletedAt: null, localDate: { gte: start, lt: end } },
      _sum: { reportingAmount: true },
    });
  }
  preference(userId: string) {
    return this.db.userPreference.findUniqueOrThrow({ where: { userId } });
  }
}
