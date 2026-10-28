import { authorizeWrite } from "../../platform/auth/actor-context.js";
import type { Context } from "../../platform/context.js";
import { AppError, authRequired } from "../../platform/http/errors.js";
import { audit } from "../../platform/http/idempotency.js";
export function csvCell(value: unknown) {
  let text =
    value == null
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  // eslint-disable-next-line no-control-regex -- Neutralize spreadsheet formulas after control characters.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export class ExportService {
  constructor(private ctx: Context) {}
  async *stream(uid: string, format: "json" | "csv") {
    if (format === "json")
      yield '{"exportedAt":' +
        JSON.stringify(this.ctx.now().toISOString()) +
        ",";
    else yield "resource,id,data\r\n";
    const tables = [
      "transaction",
      "asset",
      "debt",
      "debtEvent",
      "zakatYear",
      "zakatPaymentRecord",
      "zakatPaymentCorrection",
      "quranBookmark",
      "quranReadingPosition",
      "duaFavorite",
      "userPreference",
    ] as const;
    for (let index = 0; index < tables.length; index++) {
      const table = tables[index]!;
      if (format === "json") yield JSON.stringify(table) + ":[";
      let cursor: string | undefined;
      let first = true;
      if (table === "userPreference" || table === "quranReadingPosition") {
        const row =
          table === "userPreference"
            ? await this.ctx.db.userPreference.findUnique({
                where: { userId: uid },
              })
            : await this.ctx.db.quranReadingPosition.findUnique({
                where: { userId: uid },
              });
        if (row) {
          yield format === "json"
            ? JSON.stringify(row)
            : [csvCell(table), csvCell(uid), csvCell(row)].join(",") + "\r\n";
        }
      } else if (table === "duaFavorite") {
        while (true) {
          const rows = await this.ctx.db.duaFavorite.findMany({
            where: {
              userId: uid,
              ...(cursor ? { duaId: { gt: cursor } } : {}),
            },
            orderBy: { duaId: "asc" },
            take: 250,
          });
          for (const row of rows) {
            yield format === "json"
              ? (first ? "" : ",") + JSON.stringify(row)
              : [csvCell(table), csvCell(row.duaId), csvCell(row)].join(",") +
                "\r\n";
            first = false;
          }
          if (rows.length < 250) break;
          cursor = rows.at(-1)!.duaId;
        }
      } else {
        while (true) {
          // Explicit delegates only; never interpolate a client-supplied table/filter.
          const args = {
            where: { userId: uid, ...(cursor ? { id: { gt: cursor } } : {}) },
            orderBy: { id: "asc" as const },
            take: 250,
          };
          const db = this.ctx.db;
          const readers = {
            transaction: () => db.transaction.findMany(args),
            asset: () => db.asset.findMany(args),
            debt: () => db.debt.findMany(args),
            debtEvent: () => db.debtEvent.findMany(args),
            zakatYear: () => db.zakatYear.findMany(args),
            zakatPaymentRecord: () => db.zakatPaymentRecord.findMany(args),
            zakatPaymentCorrection: () =>
              db.zakatPaymentCorrection.findMany(args),
            quranBookmark: () => db.quranBookmark.findMany(args),
          };
          const rows = await readers[table]();
          for (const row of rows) {
            yield format === "json"
              ? (first ? "" : ",") + JSON.stringify(row)
              : [csvCell(table), csvCell(row.id), csvCell(row)].join(",") +
                "\r\n";
            first = false;
          }
          if (rows.length < 250) break;
          cursor = rows.at(-1)!.id;
        }
      }
      if (format === "json")
        yield "]" + (index === tables.length - 1 ? "" : ",");
    }
    if (format === "json") yield "}";
  }
  async deleteAccount(uid: string, proof: string) {
    return this.ctx.db.$transaction(async (tx) => {
      await authorizeWrite(tx, uid);
      const token = await tx.oneTimeToken.findFirst({
        where: {
          userId: uid,
          hash: this.ctx.tokens.hash(proof),
          kind: "DELETE",
          consumedAt: null,
          expiresAt: { gt: this.ctx.now() },
        },
      });
      if (!token)
        throw new AppError(
          401,
          "REAUTH_REQUIRED",
          "Re-authenticate before deleting your account.",
        );
      const consumed = await tx.oneTimeToken.updateMany({
        where: { id: token.id, userId: uid, consumedAt: null },
        data: { consumedAt: this.ctx.now() },
      });
      if (!consumed.count) throw authRequired();
      // Erase active account and owned rows by cascading FK; pseudonymous audit remains.
      await audit(
        tx,
        this.ctx.env.REFRESH_TOKEN_PEPPER,
        uid,
        "Account",
        "erased",
        "DELETE",
      );
      await tx.user.delete({ where: { id: uid } });
      return { ok: true as const };
    });
  }
}
