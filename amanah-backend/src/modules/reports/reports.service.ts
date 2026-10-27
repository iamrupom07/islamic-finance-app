import { DateTime } from "luxon";
import type { Context } from "../../platform/context.js";
import { D, amount } from "../../platform/money/decimal.js";
import {
  latestRates,
  fxFromSet,
  freshRate,
} from "../../platform/money/rates.js";
import { ReportsRepository } from "./reports.repository.js";
export class ReportsService {
  private repo: ReportsRepository;
  constructor(private ctx: Context) {
    this.repo = new ReportsRepository(ctx.db);
  }
  async report(uid: string, month?: string) {
    const p = await this.repo.preference(uid);
    month ??= DateTime.fromJSDate(this.ctx.now())
      .setZone(p.timezone)
      .toFormat("yyyy-MM");
    const start = DateTime.fromISO(month + "-01", { zone: "UTC" });
    const rows = await this.repo.groups(
      uid,
      start.toJSDate(),
      start.plus({ months: 1 }).toJSDate(),
    );
    const cross = rows.some((r) => r.reportingCurrency !== p.currency);
    const rates = cross ? await latestRates(this.ctx.db) : null;
    let income = new D(0),
      expenses = new D(0),
      sadaqah = new D(0);
    const category = new Map<string, InstanceType<typeof D>>();
    const base = {
      month,
      currency: p.currency,
      hasActivity: rows.length > 0,
      displayConversionEstimated: cross,
      sourceAt: rates?.quotedAt.toISOString() ?? null,
    };
    try {
      if (
        cross &&
        !freshRate(rates, this.ctx.now(), this.ctx.env.RATE_MAX_AGE_HOURS)
      )
        throw Error();
      for (const r of rows) {
        const value = fxFromSet(
          rates,
          r._sum.reportingAmount?.toString() ?? "0",
          r.reportingCurrency,
          p.currency,
        );
        if (r.type === "INCOME") income = income.add(value);
        else {
          expenses = expenses.add(value);
          category.set(
            r.category,
            (category.get(r.category) ?? new D(0)).add(value),
          );
          if (r.isSadaqah) sadaqah = sadaqah.add(value);
        }
      }
      return {
        ...base,
        status: "AVAILABLE" as const,
        income: amount(income),
        expenses: amount(expenses),
        sadaqah: amount(sadaqah),
        categories: [...category]
          .map(([category, value]) => ({ category, amount: amount(value) }))
          .sort((a, b) => new D(b.amount).comparedTo(a.amount)),
        reasons: cross
          ? [
              "Original recording amounts and rates are preserved. The selected display currency uses a current estimated conversion.",
            ]
          : [],
      };
    } catch {
      return {
        ...base,
        status: "CONVERSION_UNAVAILABLE" as const,
        income: null,
        expenses: null,
        sadaqah: null,
        categories: [],
        reasons: [
          "A fresh conversion quote is missing. Original transactions are still available.",
        ],
      };
    }
  }
}
