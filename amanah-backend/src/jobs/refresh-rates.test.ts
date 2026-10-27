import { it, expect } from "vitest";
import { RatesProvider } from "./rates.provider.js";
import { ProviderHttp } from "../platform/providers/http.js";
import { currencies } from "../modules/catalog/catalog.service.js";
const now = new Date("2026-10-26T06:00:00Z");
const timestamp = String(now.getTime() / 1000);
it("validates decimal-safe source data and explicitly maps both metals", async () => {
  const http = new ProviderHttp(1000, async (url) => {
    const u = String(url);
    const result = u.includes("exchangerate")
      ? {
          result: "success",
          base_code: "USD",
          time_last_update_unix: timestamp,
          conversion_rates: Object.fromEntries(
            currencies.map((c) => [c, c === "USD" ? "1" : "100"]),
          ),
        }
      : {
          metal: u.includes("XAU") ? "XAU" : "XAG",
          currency: "USD",
          price: "31.1034768",
          timestamp,
        };
    return new Response(JSON.stringify(result));
  });
  const result = await new RatesProvider(
    http,
    "fake-test-key",
    "fake-test-key",
  ).fetch(now);
  expect(result.metals.map((m) => m.metal)).toEqual(["XAU", "XAG"]);
  expect(result.fx).toHaveLength(currencies.length);
});
it("rejects a malformed or future market quote", async () => {
  const http = new ProviderHttp(
    1000,
    async (url) =>
      new Response(
        JSON.stringify(
          String(url).includes("exchangerate")
            ? {
                result: "success",
                base_code: "USD",
                time_last_update_unix: timestamp,
                conversion_rates: { USD: "1" },
              }
            : {
                metal: String(url).includes("XAU") ? "XAU" : "XAG",
                currency: "USD",
                price: "-1",
                timestamp,
              },
        ),
      ),
  );
  await expect(
    new RatesProvider(http, "fake", "fake").fetch(now),
  ).rejects.toThrow();
});
