import type { Prisma } from "@prisma/client";
export class DebtRepository {
  get(db: Prisma.TransactionClient, userId: string, id: string) {
    return db.debt.findFirst({ where: { id, userId, deletedAt: null } });
  }
  list(
    db: Prisma.TransactionClient,
    where: Prisma.DebtWhereInput,
    take: number,
  ) {
    return db.debt.findMany({
      where,
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  }
}
