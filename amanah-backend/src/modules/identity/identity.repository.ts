import type { Database } from "../../platform/database/client.js";
export class IdentityRepository {
  constructor(readonly db: Database) {}
  byEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }
  byId(id: string) {
    return this.db.user.findUniqueOrThrow({ where: { id } });
  }
  identity(provider: string, subject: string) {
    return this.db.authIdentity.findUnique({
      where: { provider_subject: { provider, subject } },
      include: { user: true },
    });
  }
}
