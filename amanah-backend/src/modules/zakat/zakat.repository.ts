import type { Prisma } from "@prisma/client";
export class ZakatRepository {
  async inputs(db: Prisma.TransactionClient, userId: string) {
    const preference = await db.userPreference.findUniqueOrThrow({
      where: { userId },
      include: { policy: true },
    });
    const assets = await db.asset.findMany({
      where: { userId, deletedAt: null },
      take: 1001,
    });
    const debts = await db.debt.findMany({
      where: { userId, deletedAt: null },
      take: 1001,
    });
    return { preference, policy: preference.policy, assets, debts };
  }
  year(db: Prisma.TransactionClient, userId: string, id: string) {
    return db.zakatYear.findFirst({
      where: { id, userId },
      include: {
        payments: { where: { userId }, orderBy: { createdAt: "asc" } },
      },
    });
  }
}
