import type { Prisma } from "@prisma/client";
export class TransactionsRepository {
  get(db: Prisma.TransactionClient, userId: string, id: string) {
    return db.transaction.findFirst({ where: { id, userId, deletedAt: null } });
  }
  list(
    db: Prisma.TransactionClient,
    where: Prisma.TransactionWhereInput,
    take: number,
  ) {
    return db.transaction.findMany({
      where,
      take,
      orderBy: [{ localDate: "desc" }, { id: "desc" }],
    });
  }
}
