import type { Prisma } from "@prisma/client";
export class DuaRepository {
  list(db: Prisma.TransactionClient, userId: string) {
    return db.duaFavorite.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { duaId: "asc" }],
      take: 1000,
    });
  }
  save(db: Prisma.TransactionClient, userId: string, duaId: string) {
    return db.duaFavorite.upsert({
      where: { userId_duaId: { userId, duaId } },
      create: { userId, duaId },
      update: {},
    });
  }
  remove(db: Prisma.TransactionClient, userId: string, duaId: string) {
    return db.duaFavorite.deleteMany({ where: { userId, duaId } });
  }
}
