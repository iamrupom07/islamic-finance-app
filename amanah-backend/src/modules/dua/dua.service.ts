import type { Context } from "../../platform/context.js";
import { authorizeWrite } from "../../platform/auth/actor-context.js";
import { loadContent } from "../catalog/catalog.service.js";
import { AppError } from "../../platform/http/errors.js";
import { DuaRepository } from "./dua.repository.js";
export class DuaService {
  private repo = new DuaRepository();
  private content;
  constructor(private ctx: Context) {
    this.content = loadContent(ctx.env.CONTENT_BUNDLE_PATH);
  }
  async list(uid: string) {
    return (await this.repo.list(this.ctx.db, uid)).map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  }
  async change(uid: string, duaId: string, save: boolean) {
    if (save && !this.content?.payload.duas.some((d) => d.id === duaId))
      throw new AppError(
        503,
        "CONTENT_UNAVAILABLE",
        "This dua is not in the approved content manifest.",
      );
    return this.ctx.db.$transaction(async (tx) => {
      await authorizeWrite(tx, uid);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${uid + ":dua"},0))::text`;
      if (save) {
        const prior = await tx.duaFavorite.findUnique({
          where: { userId_duaId: { userId: uid, duaId } },
        });
        if (
          !prior &&
          (await tx.duaFavorite.count({ where: { userId: uid } })) >= 1000
        )
          throw new AppError(
            422,
            "FAVORITE_LIMIT",
            "A maximum of 1000 favorites is supported.",
          );
        await this.repo.save(tx, uid, duaId);
      } else await this.repo.remove(tx, uid, duaId);
      return { ok: true as const };
    });
  }
}
