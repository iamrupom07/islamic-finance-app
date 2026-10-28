import type { Prisma, UserPreference } from "@prisma/client";
import { DateTime } from "luxon";
import { D, convert } from "./decimal.js";
import { AppError } from "../http/errors.js";
export type DbReader = Prisma.TransactionClient;
export async function latestRates(db: DbReader) {
  return db.rateSet.findFirst({
    where: {
      provider: { notIn: ["manual_seed", "fixture", "development_seed"] },
    },
    orderBy: [{ quotedAt: "desc" }, { id: "desc" }],
    include: { metals: true, fx: true },
  });
}
export type RateData = Awaited<ReturnType<typeof latestRates>>;
export function freshRate(set: RateData, now: Date, maxHours: number) {
  return (
    !!set &&
    !["manual_seed", "fixture", "development_seed"].includes(set.provider) &&
    set.quotedAt <= now &&
    now.getTime() - set.quotedAt.getTime() <= maxHours * 3600000
  );
}
export function fxFromSet(
  set: RateData,
  value: string,
  from: string,
  to: string,
) {
  if (from === to) return new D(value);
  const a = set?.fx.find((f) => f.currency === from);
  const b = set?.fx.find((f) => f.currency === to);
  if (!a || !b)
    throw new AppError(422, "RATE_UNAVAILABLE", "A currency quote is missing.");
  return convert(value, a.perUsd.toString(), b.perUsd.toString());
}
export async function recordingRate(
  db: DbReader,
  p: UserPreference,
  input: {
    currency: string;
    localDate: string;
    enteredRate?: string;
    enteredRateAt?: string;
    acceptCurrentRate?: boolean;
  },
  now: Date,
  maxHours: number,
) {
  if (input.currency === p.currency)
    return { rate: "1", source: "IDENTITY", at: now, estimated: false };
  if (input.enteredRate && input.enteredRateAt) {
    if (new D(input.enteredRate).lte(0) || new Date(input.enteredRateAt) > now)
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Use a positive rate and past source timestamp.",
      );
    return {
      rate: input.enteredRate,
      source: "USER_ENTERED",
      at: new Date(input.enteredRateAt),
      estimated: true,
    };
  }
  const set = await latestRates(db);
  if (!freshRate(set, now, maxHours))
    throw new AppError(
      422,
      "RATE_UNAVAILABLE",
      "Enter an explicit conversion rate or wait for fresh rates.",
    );
  const today = DateTime.fromJSDate(now).setZone(p.timezone).toISODate();
  if (input.localDate !== today && !input.acceptCurrentRate)
    throw new AppError(
      422,
      "HISTORICAL_RATE_REQUIRED",
      "Backdated entries need an entered rate or explicit consent to use an estimated current rate.",
    );
  return {
    rate: fxFromSet(set, "1", input.currency, p.currency).toString(),
    source: set!.provider,
    at: set!.quotedAt,
    estimated: input.localDate !== today,
  };
}
