import type { Database } from "../platform/database/client.js";
import { D } from "../platform/money/decimal.js";
import { digest } from "../platform/http/idempotency.js";
import type { RatesProvider } from "./rates.provider.js";
export async function refreshRates(
  db: Database,
  provider: RatesProvider,
  now = new Date(),
) {
  const period = now.toISOString().slice(0, 13);
  const lockKey = "rates:" + period;
  const acquired = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey},0))::text`;
    const prior = await tx.jobExecution.findUnique({
      where: { jobType_period: { jobType: "REFRESH_RATES", period } },
    });
    if (
      prior?.status === "SUCCEEDED" ||
      (prior?.status === "RUNNING" &&
        now.getTime() - prior.startedAt.getTime() < 600000)
    )
      return false;
    await tx.jobExecution.upsert({
      where: { jobType_period: { jobType: "REFRESH_RATES", period } },
      create: {
        jobType: "REFRESH_RATES",
        period,
        status: "RUNNING",
        startedAt: now,
      },
      update: {
        status: "RUNNING",
        startedAt: now,
        finishedAt: null,
        errorClass: null,
      },
    });
    return true;
  });
  if (!acquired) return { status: "SKIPPED" };
  try {
    const next = await provider.fetch(now);
    const hash = digest(JSON.stringify(next));
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('rates:publish',0))::text`;
      const lease = await tx.jobExecution.findFirst({
        where: {
          jobType: "REFRESH_RATES",
          period,
          status: "RUNNING",
          startedAt: now,
        },
      });
      if (!lease) throw new Error("JOB_LEASE_LOST");
      const prior = await tx.rateSet.findFirst({
        orderBy: { quotedAt: "desc" },
        include: { metals: true, fx: true },
      });
      if (prior) {
        for (const q of next.metals) {
          const old = prior.metals.find((m) => m.metal === q.metal);
          if (
            old &&
            new D(q.usdPerTroyOz)
              .div(old.usdPerTroyOz.toString())
              .sub(1)
              .abs()
              .gt("0.35")
          )
            throw new Error("QUOTE_JUMP_REVIEW_REQUIRED");
        }
        for (const q of next.fx) {
          const old = prior.fx.find((f) => f.currency === q.currency);
          if (
            old &&
            new D(q.perUsd).div(old.perUsd.toString()).sub(1).abs().gt("0.35")
          )
            throw new Error("FX_JUMP_REVIEW_REQUIRED");
        }
        if (next.quotedAt < prior.quotedAt) throw new Error("QUOTE_REGRESSION");
      }
      await tx.rateSet.upsert({
        where: { hash },
        create: {
          provider: next.provider,
          quotedAt: next.quotedAt,
          hash,
          metals: { create: next.metals },
          fx: { create: next.fx },
        },
        update: {},
      });
      await tx.jobExecution.updateMany({
        where: {
          jobType: "REFRESH_RATES",
          period,
          status: "RUNNING",
          startedAt: now,
        },
        data: { status: "SUCCEEDED", finishedAt: new Date() },
      });
    });
    return { status: "SUCCEEDED" };
  } catch (e) {
    await db.jobExecution.updateMany({
      where: {
        jobType: "REFRESH_RATES",
        period,
        startedAt: now,
        status: "RUNNING",
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorClass:
          e instanceof Error && /^[A-Z_]+$/.test(e.message)
            ? e.message
            : "PROVIDER_FAILURE",
      },
    });
    throw new Error("RATE_REFRESH_FAILED", { cause: e });
  }
}
