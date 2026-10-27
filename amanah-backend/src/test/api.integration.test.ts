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
    ).toBe(503);
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
    const failNow = new Date("2026-10-28T07:00:00Z");
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
          period: failNow.toISOString().slice(0, 13),
        },
      },
    });
    expect(job.status).toBe("FAILED");
    expect(job.errorClass).toBe("PROVIDER_FAILURE");
  });
});
