import { currency } from "../../platform/http/schemas.js";
import {
  ValuationService,
  marketView,
  holdingsView,
} from "../assets/valuation.service.js";
import { z } from "zod";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import type { TransactionsService } from "../transactions/transactions.service.js";
import type { ZakatService } from "../zakat/zakat.service.js";
import type { PrayerService } from "../prayer/prayer.service.js";
import { transactionView } from "../transactions/transactions.schemas.js";
import { reportView, reportQuery } from "../reports/reports.schemas.js";
import { ReportsService } from "../reports/reports.service.js";
import { zakatSummary } from "../zakat/zakat.schemas.js";
import { prayerSchedule } from "../prayer/prayer.schemas.js";
export function dashboardRoutes(
  route: Register,
  ctx: Context,
  transactions: TransactionsService,
  zakat: ZakatService,
  prayer: PrayerService,
) {
  const reports = new ReportsService(ctx);
  const valuation = new ValuationService(ctx);
  const marketQuery = z.object({ currency: currency.optional() });
  route(
    "GET",
    "/v1/market/daily",
    "Market",
    marketView,
    (req) =>
      valuation.market(req.actor.userId, marketQuery.parse(req.query).currency),
    { querystring: marketQuery },
  );
  route("GET", "/v1/holdings/summary", "Assets", holdingsView, (req) =>
    valuation.holdings(req.actor.userId),
  );
  route(
    "GET",
    "/v1/finance/overview",
    "Reports",
    z.object({
      report: reportView,
      trend: z.array(reportView),
      lifetimeSadaqah: z.string().nullable(),
      lifetimeStatus: z.enum(["AVAILABLE", "CONVERSION_UNAVAILABLE"]),
    }),
    (req) =>
      reports.overview(req.actor.userId, reportQuery.parse(req.query).month),
    { querystring: reportQuery },
  );
  route(
    "GET",
    "/v1/finance/report",
    "Reports",
    reportView,
    (req) =>
      reports.report(req.actor.userId, reportQuery.parse(req.query).month),
    { querystring: reportQuery },
  );
  route(
    "GET",
    "/v1/home",
    "Home",
    z.object({
      monthlyFinance: reportView,
      zakat: zakatSummary,
      prayer: prayerSchedule.nullable(),
      prayerUnavailableReason: z.string().nullable(),
      recentTransactions: z.array(transactionView),
      asOf: z.string(),
    }),
    async (req) => {
      const uid = req.actor.userId;
      const monthlyFinance = await reports.report(uid);
      const recent = await transactions.list(uid, { limit: 5 });
      const summary = await zakat.summary(uid);
      let schedule = null;
      let reason = null;
      try {
        schedule = await prayer.today(uid);
      } catch {
        reason =
          "Prayer times are temporarily unavailable. Open Prayer to retry.";
      }
      return {
        monthlyFinance,
        zakat: summary,
        prayer: schedule,
        prayerUnavailableReason: reason,
        recentTransactions: recent.items,
        asOf: ctx.now().toISOString(),
      };
    },
  );
}
