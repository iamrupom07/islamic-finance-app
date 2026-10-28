import { DateTime } from "luxon";
import type { Debt, Prisma } from "@prisma/client";
import { z } from "zod";
import type { Context } from "../../platform/context.js";
import { D } from "../../platform/money/decimal.js";
import { writeOnce, audit } from "../../platform/http/idempotency.js";
import { decodeCursor, encodeCursor } from "../../platform/http/pagination.js";
import { missing, conflict, AppError } from "../../platform/http/errors.js";
import { paging } from "../../platform/http/schemas.js";
import { debtInput, debtPatch } from "./debts.schemas.js";
import { DebtRepository } from "./debts.repository.js";
export const debtDto = (r: Debt) => ({
  ...r,
  originalAmount: r.originalAmount.toString(),
  remainingAmount: r.remainingAmount.toString(),
  openedOn: r.openedOn.toISOString().slice(0, 10),
  dueOn: r.dueOn?.toISOString().slice(0, 10) ?? null,
  settledAt: r.settledAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
function normalize(input: z.infer<typeof debtInput>, now: Date) {
  if (new D(input.remainingAmount).gt(input.originalAmount))
    throw new AppError(
      422,
      "BUSINESS_RULE_VIOLATION",
      "Remaining amount cannot exceed original amount.",
    );
  if (input.dueOn && input.dueOn < input.openedOn)
    throw new AppError(
      422,
      "BUSINESS_RULE_VIOLATION",
      "Due date cannot precede opening date.",
    );
  const settled = new D(input.remainingAmount).isZero();
  return {
    ...input,
    openedOn: new Date(input.openedOn),
    dueOn: input.dueOn ? new Date(input.dueOn) : null,
    status: settled ? "SETTLED" : "OPEN",
    settledAt: settled ? now : null,
  };
}
export class DebtService {
  private repo = new DebtRepository();
  constructor(private ctx: Context) {}
  async get(uid: string, id: string) {
    const r = await this.repo.get(this.ctx.db, uid, id);
    if (!r) throw missing();
    return debtDto(r);
  }
  async list(
    uid: string,
    q: z.infer<typeof paging> & { direction?: "I_OWE" | "OWED_TO_ME" },
  ) {
    const scope = JSON.stringify({ domain: "debts", direction: q.direction });
    const c = decodeCursor(this.ctx.env.CURSOR_SECRET, q.cursor, uid, scope);
    const where: Prisma.DebtWhereInput = {
      userId: uid,
      deletedAt: null,
      ...(q.direction ? { direction: q.direction } : {}),
      ...(c
        ? {
            OR: [
              { createdAt: { lt: c.date } },
              { createdAt: c.date, id: { lt: c.id } },
            ],
          }
        : {}),
    };
    const rows = await this.repo.list(this.ctx.db, where, q.limit + 1);
    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit);
    const last = items.at(-1);
    return {
      items: items.map(debtDto),
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeCursor(
              this.ctx.env.CURSOR_SECRET,
              uid,
              scope,
              last.createdAt,
              last.id,
            )
          : null,
    };
  }
  async create(uid: string, key: string, b: z.infer<typeof debtInput>) {
    return writeOnce(this.ctx.db, uid, "debts:create", key, b, async (tx) => {
      const data = normalize(b, this.ctx.now());
      const r = await tx.debt.create({ data: { ...data, userId: uid } });
      await tx.debtEvent.create({
        data: {
          userId: uid,
          debtId: r.id,
          eventType: "CREATED",
          previousRemaining: "0",
          nextRemaining: r.remainingAmount,
        },
      });
      await audit(
        tx,
        this.ctx.env.REFRESH_TOKEN_PEPPER,
        uid,
        "Debt",
        r.id,
        "CREATE",
      );
      return debtDto(r);
    });
  }
  async update(
    uid: string,
    id: string,
    key: string,
    patch: z.infer<typeof debtPatch>,
  ) {
    return writeOnce(
      this.ctx.db,
      uid,
      "debts:update:" + id,
      key,
      patch,
      async (tx) => {
        const prior = await this.repo.get(tx, uid, id);
        if (!prior) throw missing();
        const { version, ...fields } = patch;
        const b = debtInput.parse({
          direction: prior.direction,
          label: prior.label,
          note: prior.note,
          originalAmount: prior.originalAmount.toString(),
          remainingAmount: prior.remainingAmount.toString(),
          currency: prior.currency,
          openedOn: prior.openedOn.toISOString().slice(0, 10),
          dueOn: prior.dueOn?.toISOString().slice(0, 10) ?? null,
          recoverability: prior.recoverability,
          ...fields,
        });
        const data = normalize(b, this.ctx.now());
        if (prior.status === "SETTLED" && data.status === "SETTLED")
          data.settledAt = prior.settledAt;
        const change = await tx.debt.updateMany({
          where: { userId: uid, id, version, deletedAt: null },
          data: { ...data, version: { increment: 1 } },
        });
        if (!change.count) throw conflict();
        const r = (await this.repo.get(tx, uid, id))!;
        if (!prior.remainingAmount.equals(r.remainingAmount))
          await tx.debtEvent.create({
            data: {
              userId: uid,
              debtId: id,
              eventType: "CORRECTION",
              previousRemaining: prior.remainingAmount,
              nextRemaining: r.remainingAmount,
            },
          });
        await audit(
          tx,
          this.ctx.env.REFRESH_TOKEN_PEPPER,
          uid,
          "Debt",
          id,
          "UPDATE",
        );
        return debtDto(r);
      },
    );
  }
  async remove(uid: string, id: string, key: string, version: number) {
    return writeOnce(
      this.ctx.db,
      uid,
      "debts:delete:" + id,
      key,
      { version },
      async (tx) => {
        if (!(await this.repo.get(tx, uid, id))) throw missing();
        const r = await tx.debt.updateMany({
          where: { userId: uid, id, version, deletedAt: null },
          data: { deletedAt: this.ctx.now(), version: { increment: 1 } },
        });
        if (!r.count) throw conflict();
        await audit(
          tx,
          this.ctx.env.REFRESH_TOKEN_PEPPER,
          uid,
          "Debt",
          id,
          "DELETE",
        );
        return { ok: true as const };
      },
    );
  }

  async settle(uid: string, id: string, key: string, version: number) {
    return writeOnce(
      this.ctx.db,
      uid,
      "debts:settle:" + id,
      key,
      { version },
      async (tx) => {
        const prior = await this.repo.get(tx, uid, id);
        if (!prior) throw missing();
        if (prior.status === "SETTLED") return debtDto(prior);
        const change = await tx.debt.updateMany({
          where: { userId: uid, id, version, deletedAt: null },
          data: {
            remainingAmount: "0",
            status: "SETTLED",
            settledAt: this.ctx.now(),
            version: { increment: 1 },
          },
        });
        if (!change.count) throw conflict();
        await tx.debtEvent.create({
          data: {
            userId: uid,
            debtId: id,
            eventType: "SETTLED",
            previousRemaining: prior.remainingAmount,
            nextRemaining: "0",
          },
        });
        await audit(
          tx,
          this.ctx.env.REFRESH_TOKEN_PEPPER,
          uid,
          "Debt",
          id,
          "SETTLE",
        );
        return debtDto((await this.repo.get(tx, uid, id))!);
      },
    );
  }
  async repay(
    uid: string,
    id: string,
    key: string,
    b: { version: number; amount: string; paidOn: string; note?: string },
  ) {
    return writeOnce(
      this.ctx.db,
      uid,
      "debts:repay:" + id,
      key,
      b,
      async (tx) => {
        const prior = await this.repo.get(tx, uid, id);
        if (!prior) throw missing();
        if (prior.version !== b.version) throw conflict();
        const local = (
          await tx.userPreference.findUniqueOrThrow({ where: { userId: uid } })
        ).timezone;
        const today = DateTime.fromJSDate(this.ctx.now())
          .setZone(local)
          .toISODate()!;
        if (
          b.paidOn > today ||
          b.paidOn < prior.openedOn.toISOString().slice(0, 10)
        )
          throw new AppError(
            422,
            "PAYMENT_DATE_INVALID",
            "Use a payment date between opening and today.",
          );
        const next = new D(prior.remainingAmount.toString()).sub(b.amount);
        if (next.lt(0))
          throw new AppError(
            422,
            "REPAYMENT_EXCEEDS_BALANCE",
            "Payment cannot exceed the remaining balance.",
          );
        const changed = await tx.debt.updateMany({
          where: { id, userId: uid, version: b.version, deletedAt: null },
          data: {
            remainingAmount: next.toString(),
            status: next.isZero() ? "SETTLED" : "OPEN",
            settledAt: next.isZero() ? this.ctx.now() : null,
            version: { increment: 1 },
          },
        });
        if (!changed.count) throw conflict();
        await tx.debtEvent.create({
          data: {
            userId: uid,
            debtId: id,
            eventType: "REPAYMENT",
            previousRemaining: prior.remainingAmount,
            nextRemaining: next.toString(),
            paidOn: new Date(b.paidOn),
            note: b.note,
          },
        });
        await audit(
          tx,
          this.ctx.env.REFRESH_TOKEN_PEPPER,
          uid,
          "Debt",
          id,
          "REPAYMENT",
        );
        return debtDto((await this.repo.get(tx, uid, id))!);
      },
    );
  }
  async events(uid: string, id: string) {
    if (!(await this.repo.get(this.ctx.db, uid, id))) throw missing();
    return (
      await this.ctx.db.debtEvent.findMany({
        where: { userId: uid, debtId: id },
        orderBy: { occurredAt: "desc" },
        take: 100,
      })
    ).map((r) => ({
      ...r,
      previousRemaining: r.previousRemaining.toString(),
      nextRemaining: r.nextRemaining.toString(),
      paidOn: r.paidOn?.toISOString().slice(0, 10) ?? null,
      occurredAt: r.occurredAt.toISOString(),
    }));
  }
}
