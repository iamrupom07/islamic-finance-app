import type { Prisma } from "@prisma/client";
export class QuranRepository {
  progress(db: Prisma.TransactionClient, userId: string) {
    return db.quranReadingPosition.findUnique({ where: { userId } });
  }
  bookmarks(db: Prisma.TransactionClient, userId: string) {
    return db.quranBookmark.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 1000,
    });
  }
  saveBookmark(
    db: Prisma.TransactionClient,
    userId: string,
    r: { surah: number; ayah: number },
  ) {
    return db.quranBookmark.upsert({
      where: { userId_surah_ayah: { userId, ...r } },
      create: { userId, ...r },
      update: {},
    });
  }
  removeBookmark(
    db: Prisma.TransactionClient,
    userId: string,
    r: { surah: number; ayah: number },
  ) {
    return db.quranBookmark.deleteMany({ where: { userId, ...r } });
  }
}
