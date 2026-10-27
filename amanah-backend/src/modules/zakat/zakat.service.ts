import { DateTime } from "luxon";
import type { Prisma, ZakatYear, ZakatPaymentRecord } from "@prisma/client";
import type { z } from "zod";
import type { Context } from "../../platform/context.js";
import { latestRates } from "../../platform/money/rates.js";
import { D, amount } from "../../platform/money/decimal.js";
import { writeOnce, audit } from "../../platform/http/idempotency.js";
import { decodeCursor, encodeCursor } from "../../platform/http/pagination.js";
import { AppError, missing } from "../../platform/http/errors.js";
import type { paging } from "../../platform/http/schemas.js";
import type { paymentInput } from "./zakat.schemas.js";
import { calculateZakat } from "./zakat.engine.js";
import { ZakatRepository } from "./zakat.repository.js";
const paymentDto = (p: ZakatPaymentRecord) => ({
  ...p,
  amount: p.amount.toString(),
  paidOn: p.paidOn.toISOString().slice(0, 10),
  createdAt: p.createdAt.toISOString(),
});
function yearDto(y: ZakatYear & { payments: ZakatPaymentRecord[] }) {
  const recorded = y.payments.reduce(
    (sum, p) => sum.add(p.amount.toString()),
    new D(0),
  );
  const assessed = new D(y.assessedAmount.toString());
  return {
    ...y,
    assessedAmount: assessed.toFixed(2),
    recordedAmount: amount(recorded),
    remainingAmount: amount(D.max(0, assessed.sub(recorded))),
    recordStatus: recorded.gt(assessed)
      ? ("OVER_RECORDED" as const)
      : recorded.gte(assessed)
        ? ("PAID_RECORDED" as const)
        : ("PAID_PARTIAL" as const),
    createdAt: y.createdAt.toISOString(),
  };
}
export class ZakatService {
  private repo = new ZakatRepository();
  constructor(private ctx: Context) {}
  async calculate(db: Prisma.TransactionClient, uid: string) {
    const data = await this.repo.inputs(db, uid);
    if (data.assets.length > 1000 || data.debts.length > 1000)
      throw new AppError(
        422,
        "HOLDINGS_LIMIT",
        "The current calculation supports up to 1000 assets and 1000 debts.",
      );
    return calculateZakat({
      ...data,
      rates: await latestRates(db),
      now: this.ctx.now(),
      localDate: DateTime.fromJSDate(this.ctx.now())
        .setZone(data.preference.timezone)
        .toISODate()!,
      maxAgeHours: this.ctx.env.RATE_MAX_AGE_HOURS,
    });
  }
  summary(uid: string) {
    return this.ctx.db.$transaction((tx) => this.calculate(tx, uid), {
      isolationLevel: "RepeatableRead",
    });
  }
  async payment(uid: string, key: string, b: z.infer<typeof paymentInput>) {
    return writeOnce(this.ctx.db, uid, "zakat:payment", key, b, async (tx) => {
      // Serialize assessment creation and partial-payment totals for this account.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${uid + ":zakat-assessment"},0))::text`;
      let year = b.zakatYearId
        ? await this.repo.year(tx, uid, b.zakatYearId)
        : null;
      if (b.zakatYearId && !year) throw missing();
      if (!year) {
        const summary = await this.calculate(tx, uid);
        if (
          summary.status !== "POTENTIALLY_DUE" ||
          !summary.policyId ||
          !summary.estimate ||
          !summary.period
        )
          throw new AppError(
            422,
            "ASSESSMENT_UNAVAILABLE",
            "Confirm a completed period, approved policy and fresh source data before recording this assessment.",
          );
        if (summary.fingerprint !== b.snapshotFingerprint)
          throw new AppError(
            409,
            "SNAPSHOT_CHANGED",
            "The estimate changed. Review it before recording payment.",
          );
        const existing = await tx.zakatYear.findFirst({
          where: {
            userId: uid,
            periodStart: summary.period.start,
            periodEnd: summary.period.end,
          },
        });
        if (existing)
          throw new AppError(
            409,
            "YEAR_ALREADY_RECORDED",
            "Continue recording against the existing historical assessment.",
          );
        const created = await tx.zakatYear.create({
          data: {
            userId: uid,
            policyVersionId: summary.policyId,
            snapshot: summary as Prisma.InputJsonValue,
            currency: summary.currency,
            assessedAmount: summary.estimate,
            periodStart: summary.period.start,
            periodEnd: summary.period.end,
          },
        });
        year = { ...created, payments: [] };
      }
      if (b.currency !== year.currency)
        throw new AppError(
          422,
          "CURRENCY_MISMATCH",
          "Record in the assessment currency.",
        );
      const paid = year.payments.reduce(
        (sum, p) => sum.add(p.amount.toString()),
        new D(0),
      );
      if (
        paid.add(b.amount).gt(year.assessedAmount.toString()) &&
        !b.confirmOverpayment
      )
        throw new AppError(
          422,
          "OVERPAYMENT_CONFIRMATION",
          "Confirm recording more than the assessment.",
        );
      if (
        b.paidOn >
        DateTime.fromJSDate(this.ctx.now())
          .setZone(
            (
              await tx.userPreference.findUniqueOrThrow({
                where: { userId: uid },
              })
            ).timezone,
          )
          .toISODate()!
      )
        throw new AppError(
          422,
          "FUTURE_PAYMENT",
          "Use the date you actually paid outside Amanah.",
        );
      const payment = await tx.zakatPaymentRecord.create({
        data: {
          userId: uid,
          zakatYearId: year.id,
          amount: b.amount,
          currency: b.currency,
          paidOn: new Date(b.paidOn),
          note: b.note,
        },
      });
      await audit(
        tx,
        this.ctx.env.REFRESH_TOKEN_PEPPER,
        uid,
        "ZakatYear",
        year.id,
        "PAYMENT_RECORDED",
      );
      return paymentDto(payment);
    });
  }
  async history(uid: string, q: z.infer<typeof paging>) {
    const c = decodeCursor(
      this.ctx.env.CURSOR_SECRET,
      q.cursor,
      uid,
      "zakat:history",
    );
    const rows = await this.ctx.db.zakatYear.findMany({
      where: {
        userId: uid,
        ...(c
          ? {
              OR: [
                { createdAt: { lt: c.date } },
                { createdAt: c.date, id: { lt: c.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: q.limit + 1,
      include: { payments: { where: { userId: uid } } },
    });
    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit);
    const last = items.at(-1);
    return {
      items: items.map(yearDto),
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeCursor(
              this.ctx.env.CURSOR_SECRET,
              uid,
              "zakat:history",
              last.createdAt,
              last.id,
            )
          : null,
    };
  }
  async detail(uid: string, id: string) {
    const year = await this.repo.year(this.ctx.db, uid, id);
    if (!year) throw missing();
    return { ...yearDto(year), payments: year.payments.map(paymentDto) };
  }
}
