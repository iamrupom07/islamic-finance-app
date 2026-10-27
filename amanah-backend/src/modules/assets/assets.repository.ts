import type { Prisma } from "@prisma/client";
export class AssetRepository {
  get(db: Prisma.TransactionClient, userId: string, id: string) {
    return db.asset.findFirst({ where: { id, userId, deletedAt: null } });
  }
  list(
    db: Prisma.TransactionClient,
    where: Prisma.AssetWhereInput,
    take: number,
  ) {
    return db.asset.findMany({
      where,
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  }
}
