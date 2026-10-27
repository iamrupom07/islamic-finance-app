import { DateTime } from "luxon";
import type { Prisma, Transaction } from "@prisma/client";
import type { z } from "zod";
import type { Context } from "../../platform/context.js";
import { D } from "../../platform/money/decimal.js";
import { recordingRate } from "../../platform/money/rates.js";
import { writeOnce, audit } from "../../platform/http/idempotency.js";
import { decodeCursor, encodeCursor } from "../../platform/http/pagination.js";
import { missing, conflict } from "../../platform/http/errors.js";
import { TransactionsRepository } from "./transactions.repository.js";
import {
  transactionInput,
  type transactionPatch,
  type transactionQuery,
} from "./transactions.schemas.js";
export const transactionDto = (r: Transaction) => ({
  ...r,
  amount: r.amount.toString(),
  reportingRate: r.reportingRate.toString(),
  reportingAmount: r.reportingAmount.toString(),
  localDate: r.localDate.toISOString().slice(0, 10),
  rateAt: r.rateAt.toISOString(),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
export class TransactionsService {
  private repo = new TransactionsRepository();
  constructor(private ctx: Context) {}
  async get(uid: string, id: string) {
    const r = await this.repo.get(this.ctx.db, uid, id);
    if (!r) throw missing();
    return transactionDto(r);
  }
  async list(uid: string, q: z.infer<typeof transactionQuery>) {
    const scope = JSON.stringify({
      domain: "transactions",
      month: q.month,
      type: q.type,
      isSadaqah: q.isSadaqah,
    });
    const c = decodeCursor(this.ctx.env.CURSOR_SECRET, q.cursor, uid, scope);
    const start = q.month
      ? DateTime.fromISO(q.month + "-01", { zone: "UTC" })
      : null;
    const where: Prisma.TransactionWhereInput = {
      userId: uid,
      deletedAt: null,
      ...(q.type ? { type: q.type } : {}),
      ...(q.isSadaqah !== undefined
        ? { isSadaqah: q.isSadaqah === "true" }
        : {}),
      ...(start
        ? {
            localDate: {
              gte: start.toJSDate(),
              lt: start.plus({ months: 1 }).toJSDate(),
            },
          }
        : {}),
      ...(c
        ? {
            OR: [
              { localDate: { lt: c.date } },
              { localDate: c.date, id: { lt: c.id } },
            ],
          }
        : {}),
    };
    const rows = await this.repo.list(this.ctx.db, where, q.limit + 1);
    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit);
    const last = items.at(-1);
    return {
      items: items.map(transactionDto),
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeCursor(
              this.ctx.env.CURSOR_SECRET,
              uid,
              scope,
              last.localDate,
              last.id,
            )
          : null,
    };
  }
  async create(uid: string, key: string, b: z.infer<typeof transactionInput>) {
    return writeOnce(
      this.ctx.db,
      uid,
      "transactions:create",
      key,
      b,
      async (tx) => {
        const p = await tx.userPreference.findUniqueOrThrow({
          where: { userId: uid },
        });
        const rate = await recordingRate(
          tx,
          p,
          b,
          this.ctx.now(),
          this.ctx.env.RATE_MAX_AGE_HOURS,
        );
        const {
          enteredRate: _a,
          enteredRateAt: _b,
          acceptCurrentRate: _c,
          ...data
        } = b;
        void _a;
        void _b;
        void _c;
        const r = await tx.transaction.create({
          data: {
            ...data,
            userId: uid,
            localDate: new Date(b.localDate),
            reportingCurrency: p.currency,
            reportingRate: rate.rate,
            reportingAmount: new D(b.amount).mul(rate.rate).toFixed(4),
            rateSource: rate.source,
            rateAt: rate.at,
            rateEstimated: rate.estimated,
          },
        });
        await audit(
          tx,
          this.ctx.env.REFRESH_TOKEN_PEPPER,
          uid,
          "Transaction",
          r.id,
          "CREATE",
        );
        return transactionDto(r);
      },
    );
  }
  async update(
    uid: string,
    id: string,
    key: string,
    patch: z.infer<typeof transactionPatch>,
  ) {
    return writeOnce(
      this.ctx.db,
      uid,
      "transactions:update:" + id,
      key,
      patch,
      async (tx) => {
        const prior = await this.repo.get(tx, uid, id);
        if (!prior) throw missing();
        if (prior.version !== patch.version) throw conflict();
        const { version, ...fields } = patch;
        const merged = transactionInput.parse({
          type: prior.type,
          category: prior.category,
          amount: prior.amount.toString(),
          currency: prior.currency,
          localDate: prior.localDate.toISOString().slice(0, 10),
          description: prior.description,
          isSadaqah: prior.isSadaqah,
          ...fields,
        });
        const revalue =
          fields.amount !== undefined ||
          fields.currency !== undefined ||
          fields.localDate !== undefined ||
          fields.enteredRate !== undefined;
        const p = await tx.userPreference.findUniqueOrThrow({
          where: { userId: uid },
        });
        // A note-only edit preserves the original recorded rate even after display-currency changes.
        const rate = revalue
          ? await recordingRate(
              tx,
              p,
              merged,
              this.ctx.now(),
              this.ctx.env.RATE_MAX_AGE_HOURS,
            )
          : null;
        const {
          enteredRate: _a,
          enteredRateAt: _b,
          acceptCurrentRate: _c,
          ...data
        } = merged;
        void _a;
        void _b;
        void _c;
        const changed = await tx.transaction.updateMany({
          where: { id, userId: uid, version, deletedAt: null },
          data: {
            ...data,
            localDate: new Date(merged.localDate),
            version: { increment: 1 },
            ...(rate
              ? {
                  reportingCurrency: p.currency,
                  reportingRate: rate.rate,
                  reportingAmount: new D(merged.amount)
                    .mul(rate.rate)
                    .toFixed(4),
                  rateSource: rate.source,
                  rateAt: rate.at,
                  rateEstimated: rate.estimated,
                }
              : {}),
          },
        });
        if (!changed.count) throw conflict();
        await audit(
          tx,
          this.ctx.env.REFRESH_TOKEN_PEPPER,
          uid,
          "Transaction",
          id,
          "UPDATE",
        );
        return transactionDto((await this.repo.get(tx, uid, id))!);
      },
    );
  }
  async remove(uid: string, id: string, key: string, version: number) {
    return writeOnce(
      this.ctx.db,
      uid,
      "transactions:delete:" + id,
      key,
      { version },
      async (tx) => {
        const prior = await this.repo.get(tx, uid, id);
        if (!prior) throw missing();
        const r = await tx.transaction.updateMany({
          where: { id, userId: uid, version, deletedAt: null },
          data: { deletedAt: this.ctx.now(), version: { increment: 1 } },
        });
        if (!r.count) throw conflict();
        await audit(
          tx,
          this.ctx.env.REFRESH_TOKEN_PEPPER,
          uid,
          "Transaction",
          id,
          "DELETE",
        );
        return { ok: true as const };
      },
    );
  }
}
