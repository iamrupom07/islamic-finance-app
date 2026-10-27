import type { Database } from "../../platform/database/client.js";
export class CatalogRepository {
  constructor(private db: Database) {}
  policies() {
    return this.db.zakatPolicyVersion.findMany({
      where: {
        status: "APPROVED",
        reviewedBy: { not: null },
        approvedAt: { not: null },
      },
      select: {
        id: true,
        version: true,
        goldGrams: true,
        silverGrams: true,
        annualRate: true,
        sourceNotes: true,
      },
      take: 20,
    });
  }
}
