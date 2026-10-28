import { it, expect, vi } from "vitest";
import { ProviderHttp } from "./http.js";
it("does not retry a quota response", async () => {
  const fetcher = vi.fn(async () => new Response("busy", { status: 429 }));
  await expect(
    new ProviderHttp(1000, fetcher).json("https://example.test/data"),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rejects an oversized streamed body without parsing it", async () => {
  const fetcher = vi.fn(async () => new Response(new Uint8Array(2000001)));
  await expect(
    new ProviderHttp(1000, fetcher).json(
      "https://example.test/data",
      {},
      false,
    ),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("bounds declared provider response lengths", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response("{}", { headers: { "content-length": "900000000" } }),
  );
  await expect(
    new ProviderHttp(1000, fetcher).json(
      "https://example.test/data",
      {},
      false,
    ),
  ).rejects.toThrow();
});
