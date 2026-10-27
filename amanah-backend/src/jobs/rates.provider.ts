import { z } from "zod";
import { ProviderHttp } from "../platform/providers/http.js";
import { D } from "../platform/money/decimal.js";
import { currencies } from "../modules/catalog/catalog.service.js";
const value = z
  .string()
  .regex(/^\d+(?:\.\d+)?$/)
  .refine((v) => new D(v).gt(0));
const metal = z.object({
  metal: z.enum(["XAU", "XAG"]),
  currency: z.literal("USD"),
  price: value,
  timestamp: z.string().regex(/^\d+$/),
});
const fx = z.object({
  result: z.literal("success"),
  base_code: z.literal("USD"),
  time_last_update_unix: z.string().regex(/^\d+$/),
  conversion_rates: z.record(z.string(), value),
});
export class RatesProvider {
  constructor(
    private http: ProviderHttp,
    private goldKey: string,
    private fxKey: string,
  ) {}
  async fetch(now: Date) {
    const gold = metal.parse(
      await this.http.json(
        "https://www.goldapi.io/api/XAU/USD",
        { headers: { "x-access-token": this.goldKey } },
        true,
        true,
      ),
    );
    const silver = metal.parse(
      await this.http.json(
        "https://www.goldapi.io/api/XAG/USD",
        { headers: { "x-access-token": this.goldKey } },
        true,
        true,
      ),
    );
    const rates = fx.parse(
      await this.http.json(
        `https://v6.exchangerate-api.com/v6/${encodeURIComponent(this.fxKey)}/latest/USD`,
        {},
        true,
        true,
      ),
    );
    if (gold.metal !== "XAU" || silver.metal !== "XAG")
      throw new Error("QUOTE_METAL_MISMATCH");
    const stamps = [
      gold.timestamp,
      silver.timestamp,
      rates.time_last_update_unix,
    ].map((t) => new Date(Number(t) * 1000));
    if (
      stamps.some(
        (d) =>
          !Number.isFinite(d.getTime()) ||
          d > now ||
          now.getTime() - d.getTime() > 36 * 3600000,
      )
    )
      throw new Error("QUOTE_TIMESTAMP_INVALID");
    if (rates.conversion_rates.USD !== "1") throw new Error("FX_BASE_INVALID");
    const pairs = currencies.map((currency) => {
      const perUsd = rates.conversion_rates[currency];
      if (!perUsd) throw new Error("FX_PAIR_MISSING");
      return { currency, perUsd };
    });
    return {
      provider: "goldapi.io+exchangerate-api",
      quotedAt: new Date(Math.min(...stamps.map((d) => d.getTime()))),
      metals: [
        { metal: "XAU", usdPerTroyOz: gold.price, quotedAt: stamps[0]! },
        { metal: "XAG", usdPerTroyOz: silver.price, quotedAt: stamps[1]! },
      ],
      fx: pairs,
    };
  }
}
