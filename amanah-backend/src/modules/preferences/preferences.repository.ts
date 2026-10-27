import type { Database } from "../../platform/database/client.js";
export class PreferencesRepository {
  constructor(private db: Database) {}
  get(userId: string) {
    return this.db.userPreference.findUniqueOrThrow({ where: { userId } });
  }
  approvedPolicy(id: string) {
    return this.db.zakatPolicyVersion.findFirst({
      where: {
        id,
        status: "APPROVED",
        reviewedBy: { not: null },
        approvedAt: { not: null },
      },
    });
  }
}
