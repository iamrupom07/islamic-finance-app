import type { z } from "zod";
import type { QuranReadingPosition, Prisma } from "@prisma/client";
import type { Context } from "../../platform/context.js";
import { authorizeWrite } from "../../platform/auth/actor-context.js";
import { loadContent } from "../catalog/catalog.service.js";
import { AppError, conflict } from "../../platform/http/errors.js";
import type { verseRef, readingInput } from "./quran.schemas.js";
import { QuranRepository } from "./quran.repository.js";
const readingDto = (r: QuranReadingPosition) => ({
  surah: r.surah,
  ayah: r.ayah,
  version: r.version,
  edition: r.edition,
  updatedAt: r.updatedAt.toISOString(),
});
export class QuranService {
  private repo = new QuranRepository();
  private content;
  constructor(private ctx: Context) {
    this.content = loadContent(ctx.env.CONTENT_BUNDLE_PATH);
  }
  private validate(r: z.infer<typeof verseRef>) {
    const s = this.content?.payload.surahs.find((s) => s.number === r.surah);
    if (!s)
      throw new AppError(
        503,
        "CONTENT_UNAVAILABLE",
        "Verified content is not installed.",
      );
    if (r.ayah > s.verses.length)
      throw new AppError(400, "VALIDATION_ERROR", "Invalid verse reference.");
  }
  private mutate<T>(
    uid: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.ctx.db.$transaction(async (tx) => {
      await authorizeWrite(tx, uid);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${uid + ":quran"},0))::text`;
      return fn(tx);
    });
  }
  async progress(uid: string) {
    const r = await this.repo.progress(this.ctx.db, uid);
    return r ? readingDto(r) : null;
  }
  async bookmarks(uid: string) {
    return (await this.repo.bookmarks(this.ctx.db, uid)).map((r) => ({
      surah: r.surah,
      ayah: r.ayah,
      createdAt: r.createdAt.toISOString(),
    }));
  }
  saveProgress(uid: string, b: z.infer<typeof readingInput>) {
    this.validate(b);
    if (b.edition && b.edition !== this.content?.edition)
      throw new AppError(
        409,
        "CONTENT_EDITION_MISMATCH",
        "Update the app to use the installed edition.",
      );
    return this.mutate(uid, async (tx) => {
      const prior = await this.repo.progress(tx, uid);
      if (!prior) {
        if (b.version !== 1) throw conflict();
        const r = await tx.quranReadingPosition.create({
          data: {
            userId: uid,
            surah: b.surah,
            ayah: b.ayah,
            edition: this.content!.edition,
          },
        });
        return readingDto(r);
      }
      const changed = await tx.quranReadingPosition.updateMany({
        where: { userId: uid, version: b.version },
        data: {
          surah: b.surah,
          ayah: b.ayah,
          edition: this.content!.edition,
          version: { increment: 1 },
        },
      });
      if (!changed.count) throw conflict();
      const r = (await this.repo.progress(tx, uid))!;
      return readingDto(r);
    });
  }
  bookmark(uid: string, r: z.infer<typeof verseRef>) {
    this.validate(r);
    return this.mutate(uid, async (tx) => {
      const prior = await tx.quranBookmark.findUnique({
        where: { userId_surah_ayah: { userId: uid, ...r } },
      });
      if (
        !prior &&
        (await tx.quranBookmark.count({ where: { userId: uid } })) >= 1000
      )
        throw new AppError(
          422,
          "BOOKMARK_LIMIT",
          "A maximum of 1000 bookmarks is supported.",
        );
      await this.repo.saveBookmark(tx, uid, r);
      return { ok: true as const };
    });
  }
  remove(uid: string, r: z.infer<typeof verseRef>) {
    return this.mutate(uid, async (tx) => {
      await this.repo.removeBookmark(tx, uid, r);
      return { ok: true as const };
    });
  }
}
