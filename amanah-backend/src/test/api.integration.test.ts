import { refreshRates } from "../jobs/refresh-rates.service.js";
import type { RatesProvider } from "../jobs/rates.provider.js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { createApp } from "../app.js";
import { policy, rates, testEnv, now } from "./fixtures.js";
let system: Awaited<ReturnType<typeof createApp>>;
const createdUsers = new Set<string>();
const mails: { email: string; kind: string; token: string }[] = [];
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const post = (url: string, body: any, token?: string, key = randomUUID()) =>
  system.app.inject({
    method: "POST",
    url,
    headers: { ...(token ? auth(token) : {}), "idempotency-key": key },
    payload: body,
  });
async function register(email: string) {
  await post("/v1/auth/register", { email, password: "a-long-test-password" });
  const mail = mails.filter((m) => m.email === email).at(-1)!;
  expect(mail).toBeTruthy();
  expect(
    (await post("/v1/auth/verify-email", { token: mail.token })).statusCode,
  ).toBe(200);
  const data = (
    await post("/v1/auth/login", { email, password: "a-long-test-password" })
  ).json().data;
  createdUsers.add(data.user.id);
  return data;
}
beforeAll(async () => {
  if (
    !process.env.TEST_DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.startsWith("/amanah_test")
  )
    throw new Error(
      "Use an isolated database named amanah_test* via TEST_DATABASE_URL.",
    );
  system = await createApp({
    env: testEnv(),
    overrides: {
      now: () => now,
      mail: {
        async send(email, kind, token) {
          mails.push({ email, kind, token });
        },
      },
      limiter: { check: async () => ({ state: "ALLOW", retryAfter: 0 }) },
    },
  });
  await system.ctx.db.$queryRaw`SELECT 1`;
}, 30000);
afterAll(async () => {
  if (system) {
    await system.ctx.db.user.deleteMany({
      where: { id: { in: [...createdUsers] } },
    });
    await system.app.close();
  }
});
describe("real PostgreSQL API integration", () => {
  it("enforces identity, ownership, exact finance, idempotency, conflicts, settlement, export, replay and erasure", async () => {
    const a = await register("a-" + randomUUID() + "@example.test");
    const b = await register("b-" + randomUUID() + "@example.test");
    expect((await system.app.inject({ url: "/v1/assets" })).statusCode).toBe(
      401,
    );
    const body = {
      type: "INCOME",
      category: "SALARY",
      amount: "100.10",
      currency: "BDT",
      localDate: "2026-10-26",
      isSadaqah: false,
    };
    const key = randomUUID();
    const [first, retry] = await Promise.all([
      post("/v1/transactions", body, a.accessToken, key),
      post("/v1/transactions", body, a.accessToken, key),
    ]);
    expect(first.statusCode).toBe(200);
    expect(retry.statusCode).toBe(200);
    const transaction = first.json().data;
    expect(retry.json().data.id).toBe(transaction.id);
    expect(
      (
        await post(
          "/v1/transactions",
          { ...body, amount: "100.11" },
          a.accessToken,
          key,
        )
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await system.app.inject({
          url: `/v1/transactions/${transaction.id}`,
          headers: auth(b.accessToken),
        })
      ).statusCode,
    ).toBe(404);
    const update = await system.app.inject({
      method: "PATCH",
      url: `/v1/transactions/${transaction.id}`,
      headers: { ...auth(a.accessToken), "idempotency-key": randomUUID() },
      payload: { version: 1, description: "=DANGEROUS" },
    });
    expect(update.statusCode).toBe(200);
    expect(
      (
        await system.app.inject({
          method: "PATCH",
          url: `/v1/transactions/${transaction.id}`,
          headers: { ...auth(a.accessToken), "idempotency-key": randomUUID() },
          payload: { version: 1, amount: "99" },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await post(
          "/v1/transactions",
          {
            ...body,
            type: "EXPENSE",
            category: "SADAQAH",
            amount: "10.10",
            isSadaqah: true,
          },
          a.accessToken,
        )
      ).statusCode,
    ).toBe(200);
    const report = (
      await system.app.inject({
        url: "/v1/finance/report?month=2026-10",
        headers: auth(a.accessToken),
      })
    ).json().data;
    expect(report.income).toBe("100.10");
    expect(report.expenses).toBe("10.10");
    expect(report.sadaqah).toBe("10.10");
    expect(
      await system.ctx.db.asset.count({ where: { userId: a.user.id } }),
    ).toBe(0);
    expect(
      (
        await post(
          "/v1/assets",
          {
            type: "CASH",
            label: "test",
            currency: "BDT",
            valuationMode: "MANUAL",
            declaredValue: "123.4567",
            valuedOn: "2026-10-26",
          },
          a.accessToken,
        )
      ).statusCode,
    ).toBe(200);
    const created = await post(
      "/v1/debts",
      {
        direction: "I_OWE",
        label: "Debt",
        originalAmount: "50",
        remainingAmount: "50",
        currency: "BDT",
        openedOn: "2026-10-01",
      },
      a.accessToken,
    );
    expect(created.statusCode).toBe(200);
    const d = created.json().data;
    const settle = () =>
      system.app.inject({
        method: "PATCH",
        url: `/v1/debts/${d.id}/settle`,
        headers: {
          ...auth(a.accessToken),
          "idempotency-key": "settle-test-" + d.id,
        },
        payload: { version: d.version },
      });
    expect((await settle()).statusCode).toBe(200);
    expect((await settle()).json().data.remainingAmount).toBe("0");
    expect(
      await system.ctx.db.debtEvent.count({
        where: { debtId: d.id, eventType: "SETTLED" },
      }),
    ).toBe(1);
    const zakat = await system.app.inject({
      url: "/v1/zakat/summary",
      headers: auth(a.accessToken),
    });
    expect(zakat.json().data.status).toBe("CALCULATION_UNAVAILABLE");
    const exported = await system.app.inject({
      url: "/v1/me/export?format=json",
      headers: auth(a.accessToken),
    });
    expect(exported.statusCode).toBe(200);
    expect(exported.json().transaction).toHaveLength(2);
    expect(exported.payload).not.toContain(b.user.email);
    expect(
      (
        await system.app.inject({
          url: "/v1/transactions?limit=500",
          headers: auth(a.accessToken),
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await system.app.inject({
          method: "PUT",
          url: "/v1/quran/bookmarks/1/1",
          headers: auth(a.accessToken),
        })
      ).statusCode,
    ).toBe(200);
    const rotated = await post("/v1/auth/refresh", {
      refreshToken: b.refreshToken,
    });
    expect(rotated.statusCode).toBe(200);
    expect(
      (await post("/v1/auth/refresh", { refreshToken: b.refreshToken }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await system.app.inject({
          url: "/v1/me",
          headers: auth(rotated.json().data.accessToken),
        })
      ).statusCode,
    ).toBe(401);
    const proof = (
      await post(
        "/v1/auth/reauth",
        { password: "a-long-test-password" },
        a.accessToken,
      )
    ).json().data.proof;
    expect(
      (
        await system.app.inject({
          method: "DELETE",
          url: "/v1/me/account",
          headers: auth(a.accessToken),
          payload: { proof, confirmation: "DELETE" },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      await system.ctx.db.transaction.count({ where: { userId: a.user.id } }),
    ).toBe(0);
    expect(
      (await system.app.inject({ url: "/v1/me", headers: auth(a.accessToken) }))
        .statusCode,
    ).toBe(401);
  }, 30000);

  it("freezes historical assessments, protects partial payments and rejects cross-account references", async () => {
    const a = await register("zakat-" + randomUUID() + "@example.test");
    const b = await register("other-" + randomUUID() + "@example.test");
    const db = system.ctx.db;
    const approved = await db.zakatPolicyVersion.create({
      data: {
        version: "TEST-" + randomUUID().slice(0, 8),
        status: "APPROVED",
        goldGrams: policy.goldGrams,
        silverGrams: policy.silverGrams,
        annualRate: policy.annualRate,
        rules: policy.rules,
        sourceNotes: "SYNTHETIC SOFTWARE TEST ONLY, NOT A RELIGIOUS POLICY",
        reviewedBy: "TEST FIXTURE",
        approvedAt: now,
      },
    });
    const rateSet = await db.rateSet.create({
      data: {
        provider: "TEST_FIXTURE",
        quotedAt: now,
        hash: randomUUID(),
        metals: { create: rates.metals },
        fx: { create: rates.fx },
      },
    });
    const pref = await db.userPreference.findUniqueOrThrow({
      where: { userId: a.user.id },
    });
    const saved = await system.app.inject({
      method: "PATCH",
      url: "/v1/me/preferences",
      headers: auth(a.accessToken),
      payload: {
        version: pref.version,
        policyVersionId: approved.id,
        hijriAnchor: "1447-01-01",
        continuityConfirmed: true,
      },
    });
    expect(saved.statusCode).toBe(200);
    expect(
      (
        await post(
          "/v1/assets",
          {
            type: "CASH",
            label: "Test wealth",
            currency: "BDT",
            valuationMode: "MANUAL",
            declaredValue: "100000",
            valuedOn: "2026-10-26",
          },
          a.accessToken,
        )
      ).statusCode,
    ).toBe(200);
    const summary = (
      await system.app.inject({
        url: "/v1/zakat/summary",
        headers: auth(a.accessToken),
      })
    ).json().data;
    expect(summary.status).toBe("POTENTIALLY_DUE");
    expect(summary.estimate).toBe("2500.00");
    const input = {
      snapshotFingerprint: summary.fingerprint,
      amount: "1000",
      currency: "BDT",
      paidOn: "2026-10-26",
    };
    const key = randomUUID();
    const results = await Promise.all([
      post("/v1/zakat/payments", input, a.accessToken, key),
      post("/v1/zakat/payments", input, a.accessToken, key),
    ]);
    expect(results.map((r) => r.statusCode)).toEqual([200, 200]);
    const yearId = results[0]!.json().data.zakatYearId;
    expect(
      await db.zakatPaymentRecord.count({ where: { userId: a.user.id } }),
    ).toBe(1);
    const detail = () =>
      system.app.inject({
        url: "/v1/zakat/history/" + yearId,
        headers: auth(a.accessToken),
      });
    const snapshot = (await detail()).json().data;
    expect(snapshot.recordStatus).toBe("PAID_PARTIAL");
    expect(snapshot.remainingAmount).toBe("1500.00");
    expect(
      (
        await post(
          "/v1/zakat/payments",
          {
            zakatYearId: yearId,
            amount: "2000",
            currency: "BDT",
            paidOn: "2026-10-26",
          },
          a.accessToken,
        )
      ).statusCode,
    ).toBe(422);
    expect(
      (
        await post(
          "/v1/zakat/payments",
          {
            zakatYearId: yearId,
            amount: "1",
            currency: "BDT",
            paidOn: "2026-10-26",
          },
          b.accessToken,
        )
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await post(
          "/v1/zakat/payments",
          {
            zakatYearId: yearId,
            amount: "1500",
            currency: "BDT",
            paidOn: "2026-10-26",
          },
          a.accessToken,
        )
      ).statusCode,
    ).toBe(200);
    await db.rateSet.create({
      data: {
        provider: "TEST_REVISED",
        quotedAt: new Date(now.getTime() + 1000),
        hash: randomUUID(),
        metals: {
          create: rates.metals.map((m: any) => ({
            ...m,
            usdPerTroyOz: "1000",
          })),
        },
        fx: { create: rates.fx },
      },
    });
    const after = (await detail()).json().data;
    expect(after.recordStatus).toBe("PAID_RECORDED");
    expect(after.snapshot).toEqual(snapshot.snapshot);
    await expect(
      db.zakatYear.update({
        where: { id: yearId },
        data: { assessedAmount: "999" },
      }),
    ).rejects.toThrow();
    await expect(
      db.zakatPolicyVersion.update({
        where: { id: approved.id },
        data: { annualRate: "0.5" },
      }),
    ).rejects.toThrow();
    await expect(
      db.zakatPaymentRecord.create({
        data: {
          userId: b.user.id,
          zakatYearId: yearId,
          amount: "1",
          currency: "BDT",
          paidOn: now,
        },
      }),
    ).rejects.toThrow();
    expect(rateSet.id).toBeTruthy();
  }, 30000);
  it("has non-enumerating recovery and rejects reused verification links and forged social tokens", async () => {
    const email = "reset-" + randomUUID() + "@example.test";
    const a = await register(email);
    const prior = mails.find((m) => m.email === email && m.kind === "VERIFY")!;
    expect(
      (await post("/v1/auth/verify-email", { token: prior.token })).statusCode,
    ).toBe(400);
    const known = await post("/v1/auth/password/forgot", { email });
    const unknown = await post("/v1/auth/password/forgot", {
      email: "nobody-" + randomUUID() + "@example.test",
    });
    expect(known.json().data).toEqual(unknown.json().data);
    const reset = mails.findLast(
      (m) => m.email === email && m.kind === "RESET",
    )!;
    expect(
      (
        await post("/v1/auth/password/reset", {
          token: reset.token,
          password: "new-long-test-password",
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await post("/v1/auth/password/reset", {
          token: reset.token,
          password: "another-long-test-password",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await system.app.inject({ url: "/v1/me", headers: auth(a.accessToken) }))
        .statusCode,
    ).toBe(401);
    expect(
      (await post("/v1/auth/google", { idToken: "forged".repeat(20) }))
        .statusCode,
    ).toBe(503);
  });
  it("scopes stable cursors and prevents duplicate refresh races from keeping a stolen family alive", async () => {
    const a = await register("cursor-" + randomUUID() + "@example.test");
    const b = await register("cursor-b-" + randomUUID() + "@example.test");
    for (let i = 0; i < 3; i++)
      expect(
        (
          await post(
            "/v1/transactions",
            {
              type: "EXPENSE",
              category: "FOOD",
              amount: String(i + 1),
              currency: "BDT",
              localDate: "2026-10-26",
              isSadaqah: false,
            },
            a.accessToken,
          )
        ).statusCode,
      ).toBe(200);
    const first = (
      await system.app.inject({
        url: "/v1/transactions?limit=2",
        headers: auth(a.accessToken),
      })
    ).json().data;
    expect(first.items).toHaveLength(2);
    expect(first.hasMore).toBe(true);
    const next = (
      await system.app.inject({
        url:
          "/v1/transactions?limit=2&cursor=" +
          encodeURIComponent(first.nextCursor),
        headers: auth(a.accessToken),
      })
    ).json().data;
    expect(next.items).toHaveLength(1);
    expect(first.items.map((r: any) => r.id)).not.toContain(next.items[0].id);
    expect(
      (
        await system.app.inject({
          url:
            "/v1/transactions?cursor=" + encodeURIComponent(first.nextCursor),
          headers: auth(b.accessToken),
        })
      ).statusCode,
    ).toBe(400);
    const refresh = await Promise.all([
      post("/v1/auth/refresh", { refreshToken: a.refreshToken }),
      post("/v1/auth/refresh", { refreshToken: a.refreshToken }),
    ]);
    expect(refresh.map((r) => r.statusCode).sort()).toEqual([200, 401]);
    const success = refresh.find((r) => r.statusCode === 200)!;
    expect(
      (
        await system.app.inject({
          url: "/v1/me",
          headers: auth(success.json().data.accessToken),
        })
      ).statusCode,
    ).toBe(401);
  });
  it("enforces numeric constraints and composite ownership at the DB boundary", async () => {
    const u = await system.ctx.db.user.create({
      data: {
        email: "constraints-" + randomUUID() + "@example.test",
        preference: { create: {} },
      },
    });
    createdUsers.add(u.id);
    await expect(
      system.ctx.db.asset.create({
        data: {
          userId: u.id,
          type: "CASH",
          label: "invalid",
          currency: "BDT",
          valuationMode: "MANUAL",
          declaredValue: "-1",
          valuedOn: now,
        },
      }),
    ).rejects.toThrow();
  });
  it("deduplicates overlapping refresh jobs and records provider failure without leaking upstream details", async () => {
    const db = system.ctx.db;
    const previous = await db.rateSet.findFirstOrThrow({
      orderBy: { quotedAt: "desc" },
      include: { metals: true, fx: true },
    });
    const jobNow = new Date("2026-10-28T06:00:00Z");
    let calls = 0;
    const provider = {
      fetch: async () => {
        calls++;
        return {
          provider: "TEST_JOB",
          quotedAt: jobNow,
          metals: previous.metals.map((m) => ({
            metal: m.metal,
            usdPerTroyOz: m.usdPerTroyOz.toString(),
            quotedAt: jobNow,
          })),
          fx: previous.fx.map((f) => ({
            currency: f.currency,
            perUsd: f.perUsd.toString(),
          })),
        };
      },
    } as unknown as RatesProvider;
    const result = await Promise.all([
      refreshRates(db, provider, jobNow),
      refreshRates(db, provider, jobNow),
    ]);
    expect(result.map((r) => r.status).sort()).toEqual([
      "SKIPPED",
      "SUCCEEDED",
    ]);
    expect(calls).toBe(1);
    const failNow = new Date("2026-10-29T07:00:00Z");
    const bad = {
      fetch: async () => {
        throw new Error("private-provider-key-should-never-be-persisted");
      },
    } as unknown as RatesProvider;
    await expect(refreshRates(db, bad, failNow)).rejects.toThrow(
      "RATE_REFRESH_FAILED",
    );
    const job = await db.jobExecution.findUniqueOrThrow({
      where: {
        jobType_period: {
          jobType: "REFRESH_RATES",
          period: failNow.toISOString().slice(0, 10),
        },
      },
    });
    expect(job.status).toBe("FAILED");
    expect(job.errorClass).toBe("PROVIDER_FAILURE");
  });
});

it("Phase 1: exact mixed valuations, notes, repayment retries, complete totals, reporting and correction chains", async () => {
  const a = await register("phase1-" + randomUUID() + "@example.test"),
    b = await register("phase1-other-" + randomUUID() + "@example.test");
  const db = system.ctx.db;
  // Previous tests deliberately published a future fixture; restore a clean quote basis for this independent scenario.
  await db.rateSet.deleteMany({ where: { quotedAt: { gt: now } } });
  const rs = await db.rateSet.create({
    data: {
      provider: "TEST_FIXTURE",
      quotedAt: now,
      hash: randomUUID(),
      metals: { create: rates.metals },
      fx: { create: rates.fx },
    },
  });
  const approved = await db.zakatPolicyVersion.create({
    data: {
      version: "PHASE1-TEST-" + randomUUID().slice(0, 8),
      status: "APPROVED",
      goldGrams: policy.goldGrams,
      silverGrams: policy.silverGrams,
      annualRate: policy.annualRate,
      rules: policy.rules,
      sourceNotes: "SOFTWARE FIXTURE ONLY",
      reviewedBy: "SOFTWARE FIXTURE",
      approvedAt: now,
    },
  });
  const pref = (
    await system.app.inject({ url: "/v1/me", headers: auth(a.accessToken) })
  ).json().data.preferences;
  expect(
    (
      await system.app.inject({
        method: "PATCH",
        url: "/v1/me/preferences",
        headers: auth(a.accessToken),
        payload: {
          version: pref.version,
          policyVersionId: approved.id,
          hijriAnchor: "1447-01-01",
          continuityConfirmed: true,
        },
      })
    ).statusCode,
  ).toBe(200);
  const read = async (url: string, token = a.accessToken) =>
    system.app.inject({ url, headers: auth(token) });
  const cash = await post(
    "/v1/assets",
    {
      type: "CASH",
      label: "Cash",
      note: "Persistent cash note",
      currency: "BDT",
      valuationMode: "MANUAL",
      declaredValue: "1000",
      valuedOn: "2026-10-26",
    },
    a.accessToken,
  );
  expect(cash.statusCode).toBe(200);
  expect(
    (await read("/v1/assets/" + cash.json().data.id)).json().data.note,
  ).toBe("Persistent cash note");
  expect(
    (
      await post(
        "/v1/assets",
        {
          type: "SAVINGS",
          label: "USD holding",
          currency: "USD",
          valuationMode: "MANUAL",
          declaredValue: "1",
          valuedOn: "2026-10-26",
        },
        a.accessToken,
      )
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await post(
        "/v1/assets",
        {
          type: "GOLD",
          label: "Pure gold",
          weightQuantity: "1",
          weightUnit: "g",
          currency: "BDT",
          valuationMode: "METAL_RATE",
          weightGrams: "1",
          purity: "1",
          valuedOn: "2026-10-26",
        },
        a.accessToken,
      )
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await post(
        "/v1/assets",
        {
          type: "GOLD",
          label: "Bad unit",
          currency: "BDT",
          valuationMode: "METAL_RATE",
          weightQuantity: "1",
          weightUnit: "ozt",
          weightGrams: "1",
          purity: "1",
          valuedOn: "2026-10-26",
        },
        a.accessToken,
      )
    ).statusCode,
  ).toBe(422);
  let h = (await read("/v1/holdings/summary")).json().data;
  expect(h.status).toBe("AVAILABLE");
  expect(h.assetsTotal).toBe("11100.00");
  const market = (await read("/v1/market/daily?currency=BDT")).json().data;
  expect(market.goldPerGram).toBe("10000.000000000000000000000000");
  expect(market.silverPerGram).toBe("100.000000000000000000000000");
  expect(market.goldNisab).toBe("1000000.00");
  expect(market.silverNisab).toBe("50000.00");
  const debtResponse = await post(
    "/v1/debts",
    {
      direction: "I_OWE",
      label: "Partly repaid",
      note: "Persistent debt note",
      originalAmount: "1000",
      remainingAmount: "200",
      currency: "BDT",
      openedOn: "2026-10-01",
      dueOn: "2026-10-26",
      recoverability: "RECOVERABLE",
    },
    a.accessToken,
  );
  expect(debtResponse.statusCode).toBe(200);
  let debt = debtResponse.json().data;
  const repayKey = randomUUID(),
    body = {
      version: debt.version,
      amount: "50",
      paidOn: "2026-10-26",
      note: "Paid externally",
    };
  const replies = await Promise.all([
    post(`/v1/debts/${debt.id}/repayments`, body, a.accessToken, repayKey),
    post(`/v1/debts/${debt.id}/repayments`, body, a.accessToken, repayKey),
  ]);
  expect(replies.map((r) => r.statusCode)).toEqual([200, 200]);
  debt = replies[0]!.json().data;
  expect(debt.remainingAmount).toBe("150");
  const updated = await system.app.inject({
    method: "PATCH",
    url: `/v1/debts/${debt.id}`,
    headers: { ...auth(a.accessToken), "idempotency-key": randomUUID() },
    payload: { version: debt.version, label: "Renamed only" },
  });
  expect(updated.statusCode).toBe(200);
  expect(updated.json().data.remainingAmount).toBe("150");
  expect(updated.json().data.note).toBe("Persistent debt note");
  expect(
    (await read(`/v1/debts/${debt.id}/events`))
      .json()
      .data.filter((e: any) => e.eventType === "REPAYMENT"),
  ).toHaveLength(1);
  expect(
    (await post(`/v1/debts/${debt.id}/repayments`, body, b.accessToken))
      .statusCode,
  ).toBe(404);
  expect(
    (
      await post(
        `/v1/debts/${debt.id}/repayments`,
        { ...body, version: updated.json().data.version, amount: "151" },
        a.accessToken,
      )
    ).statusCode,
  ).toBe(422);
  for (let i = 0; i < 21; i++)
    expect(
      (
        await post(
          "/v1/assets",
          {
            type: "CASH",
            label: `Page ${i}`,
            currency: "BDT",
            valuationMode: "MANUAL",
            declaredValue: "1",
            valuedOn: "2026-10-26",
          },
          a.accessToken,
        )
      ).statusCode,
    ).toBe(200);
  const page1 = (await read("/v1/assets?limit=20")).json().data;
  expect(page1.hasMore).toBe(true);
  expect(
    (
      await read(
        "/v1/assets?limit=20&cursor=" + encodeURIComponent(page1.nextCursor),
      )
    ).json().data.items,
  ).toHaveLength(4);
  h = (await read("/v1/holdings/summary")).json().data;
  expect(h.assetCount).toBe(24);
  expect(h.assetsTotal).toBe("11121.00");
  expect(h.iOweTotal).toBe("150.00");
  const overview = (await read("/v1/finance/overview?month=2026-10")).json()
    .data;
  expect(overview.trend).toHaveLength(6);
  expect(overview.report.income).toBe("0.00");
  expect(overview.lifetimeSadaqah).toBe("0.00");
  const year = await db.zakatYear.create({
    data: {
      userId: a.user.id,
      policyVersionId: approved.id,
      snapshot: (await read("/v1/zakat/summary")).json().data,
      currency: "BDT",
      assessedAmount: "100",
      periodStart: "2025-01-01",
      periodEnd: "2026-01-01",
    },
  });
  const payment = (
    await post(
      "/v1/zakat/payments",
      {
        zakatYearId: year.id,
        amount: "80",
        currency: "BDT",
        paidOn: "2026-10-26",
      },
      a.accessToken,
    )
  ).json().data;
  const correction = {
    replacementAmount: "20",
    reason: "Original entry was wrong",
    lastCorrectionId: null,
  };
  const ck = randomUUID();
  expect(
    (
      await post(
        `/v1/zakat/payments/${payment.id}/corrections`,
        correction,
        a.accessToken,
        ck,
      )
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await post(
        `/v1/zakat/payments/${payment.id}/corrections`,
        correction,
        a.accessToken,
        ck,
      )
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await post(
        `/v1/zakat/payments/${payment.id}/corrections`,
        correction,
        a.accessToken,
      )
    ).statusCode,
  ).toBe(409);
  expect(
    (
      await post(
        `/v1/zakat/payments/${payment.id}/corrections`,
        correction,
        b.accessToken,
      )
    ).statusCode,
  ).toBe(404);
  const original = await db.zakatPaymentRecord.findUniqueOrThrow({
    where: { id: payment.id },
  });
  expect(original.amount.toString()).toBe("80");
  const corrected = await db.zakatPaymentRecord.findUniqueOrThrow({
    where: { id: payment.id },
    include: { corrections: true },
  });
  expect(corrected.corrections).toHaveLength(1);
  expect(corrected.corrections[0]!.replacementAmount.toString()).toBe("20");
  const history = (await read(`/v1/zakat/history/${year.id}`)).json().data;
  expect(history.recordedAmount).toBe("20.00");
  expect(history.remainingAmount).toBe("80.00");
  expect(history.payments[0].effectiveAmount).toBe("20");
  const statement = await read(`/v1/zakat/history/${year.id}/statement`);
  expect(statement.statusCode).toBe(200);
  expect(statement.headers["cache-control"]).toBe("private, no-store");
  expect(statement.body).toContain("Amanah assessment statement");
  expect(statement.body).toContain("correction history");
  expect(
    (
      await system.app.inject({
        url: `/v1/zakat/history/${year.id}/statement`,
        headers: auth(b.accessToken),
      })
    ).statusCode,
  ).toBe(404);

  const exported = (await read("/v1/me/export?format=json")).json();
  expect(exported.zakatPaymentCorrection).toHaveLength(1);
  expect(
    exported.asset.find((x: any) => x.id === cash.json().data.id).note,
  ).toBe("Persistent cash note");
  await db.rateSet.delete({ where: { id: rs.id } });
}, 30000);

it("saves edition-aware reading progress, validates exact references, and isolates bookmarks and dua favorites", async () => {
  const a = await register("reading-" + randomUUID() + "@example.test"),
    b = await register("other-reading-" + randomUUID() + "@example.test");
  const catalog = (await system.app.inject({ url: "/v1/catalog" })).json().data;
  expect(catalog.content.available).toBe(true);
  const edition = catalog.content.edition;
  const put = (url: string, payload: Record<string, unknown> | undefined) =>
    system.app.inject({
      method: "PUT",
      url,
      headers: auth(a.accessToken),
      payload,
    });
  const saved = await put("/v1/quran/progress", {
    surah: 114,
    ayah: 6,
    version: 1,
    edition,
  });
  expect(saved.statusCode).toBe(200);
  expect(saved.json().data.edition).toBe(edition);
  expect(
    (
      await put("/v1/quran/progress", {
        surah: 114,
        ayah: 7,
        version: 1,
        edition,
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await put("/v1/quran/progress", {
        surah: 114,
        ayah: 6,
        version: 1,
        edition: "wrong",
      })
    ).statusCode,
  ).toBe(409);
  const edits = await Promise.all([
    put("/v1/quran/progress", { surah: 1, ayah: 2, version: 1, edition }),
    put("/v1/quran/progress", { surah: 1, ayah: 3, version: 1, edition }),
  ]);
  expect(edits.map((r) => r.statusCode).sort()).toEqual([200, 409]);
  expect((await put("/v1/quran/bookmarks/114/6", undefined)).statusCode).toBe(
    200,
  );
  expect((await put("/v1/quran/bookmarks/114/7", undefined)).statusCode).toBe(
    400,
  );
  expect(
    (
      await system.app.inject({
        url: "/v1/quran/bookmarks",
        headers: auth(b.accessToken),
      })
    ).json().data,
  ).toEqual([]);
  expect(
    (await put("/v1/dua/favorites/entry-000001", undefined)).statusCode,
  ).toBe(200);
  expect(
    (
      await system.app.inject({
        url: "/v1/dua/favorites",
        headers: auth(b.accessToken),
      })
    ).json().data,
  ).toEqual([]);
  const exported = (
    await system.app.inject({
      url: "/v1/me/export?format=json",
      headers: auth(a.accessToken),
    })
  ).json();
  expect(exported.quranReadingPosition[0].edition).toBe(edition);
  expect(exported.quranBookmark).toHaveLength(1);
  expect(exported.duaFavorite).toHaveLength(1);
}, 30000);
