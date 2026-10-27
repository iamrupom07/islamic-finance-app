import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { interpretLimit } from "./cache/upstash.js";
import { encodeCursor, decodeCursor } from "./http/pagination.js";
import { csvCell } from "../modules/exports/exports.service.js";
import { convert, metalValue, D } from "./money/decimal.js";
import { ProviderHttp } from "./providers/http.js";
import { transactionPatch } from "../modules/transactions/transactions.schemas.js";
const secret = "test-only-cursor-12345678901234567";
describe("security and boundary rules", () => {
  it("fails closed on an Upstash success caused by timeout", () =>
    expect(
      interpretLimit({ success: true, reason: "timeout", reset: 0 }).state,
    ).toBe("UNAVAILABLE"));
  it("interprets an actual rejection", () =>
    expect(
      interpretLimit({ success: false, reset: Date.now() + 1000 }).state,
    ).toBe("DENY"));
  it("rejects a modified cursor", () => {
    const uid = randomUUID();
    const c = encodeCursor(secret, uid, "test", new Date(), randomUUID());
    expect(() => decodeCursor(secret, c + "x", uid, "test")).toThrow();
  });
  it("binds cursors to user and filter", () => {
    const uid = randomUUID();
    const c = encodeCursor(secret, uid, "a", new Date(), randomUUID());
    expect(() => decodeCursor(secret, c, randomUUID(), "a")).toThrow();
    expect(() => decodeCursor(secret, c, uid, "b")).toThrow();
  });
  it.each(['=HYPERLINK("bad")', "+cmd", "-cmd", "@SUM(A1)", "  =cmd", "\tcmd"])(
    "protects CSV formula prefix %s",
    (v) => expect(csvCell(v).startsWith("\"'")).toBe(true),
  );
  it("keeps decimals exact", () =>
    expect(new D("0.1").add("0.2").toString()).toBe("0.3"));
  it("converts in the right direction", () =>
    expect(convert("100", "100", "1").toString()).toBe("1"));
  it("converts troy ounces exactly", () =>
    expect(metalValue("31.1034768", "1", "100", "2").toString()).toBe("200"));
  it("does not add default false to a note-only PATCH", () =>
    expect(transactionPatch.parse({ version: 1, description: "note" })).toEqual(
      { version: 1, description: "note" },
    ));
  it("parses market decimal values without IEEE precision loss", async () => {
    const p = new ProviderHttp(
      1000,
      async () => new Response('{"price":123456789012345.123456789012}'),
    );
    expect(await p.json("https://test.invalid", {}, true, true)).toEqual({
      price: "123456789012345.123456789012",
    });
  });
  it("does not expose failed-provider payloads", async () => {
    const p = new ProviderHttp(
      1000,
      async () => new Response("SECRET", { status: 500 }),
    );
    await expect(p.json("https://test.invalid")).rejects.toThrow(
      "temporarily unavailable",
    );
  });
});

it("does not immediately retry an upstream 429", async () => {
  let calls = 0;
  const p = new ProviderHttp(1000, async () => {
    calls++;
    return new Response("", { status: 429, headers: { "Retry-After": "60" } });
  });
  await expect(p.json("https://test.invalid")).rejects.toThrow();
  expect(calls).toBe(1);
});
