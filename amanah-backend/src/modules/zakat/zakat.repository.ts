import type { Prisma } from "@prisma/client";
export class ZakatRepository {
  async inputs(db: Prisma.TransactionClient, userId: string) {
    const preference = await db.userPreference.findUniqueOrThrow({
      where: { userId },
      include: { policy: true },
    });
    let policy = preference.policy;
    if (!policy) {
      policy = await db.zakatPolicyVersion.findFirst({
        where: {
          status: "APPROVED",
          reviewedBy: { not: null },
          approvedAt: { not: null },
        },
        orderBy: { approvedAt: "desc" },
      });
      if (policy) {
        await db.userPreference.update({
          where: { userId },
          data: { policyVersionId: policy.id },
        });
        preference.policyVersionId = policy.id;
        (preference as any).policy = policy;
      }
    }
    const assets = await db.asset.findMany({
      where: { userId, deletedAt: null },
      take: 1001,
    });
    const debts = await db.debt.findMany({
      where: { userId, deletedAt: null },
      take: 1001,
    });
    return { preference, policy, assets, debts };
  }
  year(db: Prisma.TransactionClient, userId: string, id: string) {
    return db.zakatYear.findFirst({
      where: { id, userId },
      include: {
        payments: {
          where: { userId },
          orderBy: { createdAt: "asc" },
          include: { corrections: { orderBy: { sequence: "desc" } } },
        },
      },
    });
  }
}
