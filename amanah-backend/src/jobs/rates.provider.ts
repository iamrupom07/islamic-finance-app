import { z } from "zod";
import { ProviderHttp } from "../platform/providers/http.js";
import { D } from "../platform/money/decimal.js";
import { currencies } from "../modules/catalog/catalog.service.js";
const value = z
  .string()
  .regex(/^\d+(?:\.\d+)?$/)
  .refine((v) => new D(v).gt(0));
const metal = z.object({
  symbol: z.enum(["XAU", "XAG"]),
  currency: z.literal("USD").optional(),
  price: value,
  updatedAt: z.iso.datetime(),
});
const fx = z.object({
  result: z.literal("success"),
  base_code: z.literal("USD"),
  time_last_update_unix: z.string().regex(/^\d+$/),
  rates: z.record(z.string(), value),
});
export class RatesProvider {
  constructor(private http: ProviderHttp) {}
  async fetch(now: Date) {
    const started = Date.now();
    const gold = metal.parse(
      await this.http.json(
        "https://api.gold-api.com/price/XAU",
        {},
        true,
        true,
      ),
    );
    const silver = metal.parse(
      await this.http.json(
        "https://api.gold-api.com/price/XAG",
        {},
        true,
        true,
      ),
    );
    const rates = fx.parse(
      await this.http.json(
        "https://open.er-api.com/v6/latest/USD",
        {},
        true,
        true,
      ),
    );
    if (gold.symbol !== "XAU" || silver.symbol !== "XAG")
      throw Error("QUOTE_METAL_MISMATCH");
    const stamps = [
      new Date(gold.updatedAt),
      new Date(silver.updatedAt),
      new Date(Number(rates.time_last_update_unix) * 1000),
    ];
    const validationNow = new Date(
      now.getTime() + Math.max(0, Date.now() - started),
    );
    if (
      stamps.some(
        (d) =>
          !Number.isFinite(d.getTime()) ||
          d > validationNow ||
          validationNow.getTime() - d.getTime() > 36 * 3600000,
      )
    )
      throw Error("QUOTE_TIMESTAMP_INVALID");
    if (!new D(rates.rates.USD ?? 0).eq(1)) throw Error("FX_BASE_INVALID");
    return {
      provider: "gold-api.com+open.er-api.com",
      quotedAt: new Date(Math.min(...stamps.map((d) => d.getTime()))),
      metals: [
        { metal: "XAU", usdPerTroyOz: gold.price, quotedAt: stamps[0]! },
        { metal: "XAG", usdPerTroyOz: silver.price, quotedAt: stamps[1]! },
      ],
      fx: currencies.map((currency) => {
        const perUsd = rates.rates[currency];
        if (!perUsd) throw Error("FX_PAIR_MISSING");
        return { currency, perUsd };
      }),
    };
  }
}
