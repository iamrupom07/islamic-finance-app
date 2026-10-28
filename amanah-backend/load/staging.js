/* global __ENV */
import http from "k6/http";
import { check } from "k6";
import exec from "k6/execution";
const base = __ENV.STAGING_API_ORIGIN,
  tokens = __ENV.STAGING_TEST_ACCESS_TOKENS
    ? JSON.parse(__ENV.STAGING_TEST_ACCESS_TOKENS)
    : [__ENV.STAGING_TEST_ACCESS_TOKEN];
if (
  !base?.startsWith("https://") ||
  !tokens.length ||
  tokens.some((t) => !t) ||
  __ENV.AMANAH_STAGING_TEST !== "true"
)
  throw Error(
    "Explicit staging HTTPS origin, synthetic test token and AMANAH_STAGING_TEST=true required.",
  );
export const options = {
  scenarios: {
    read_mix: {
      executor: "ramping-arrival-rate",
      startRate: 1,
      timeUnit: "1s",
      preAllocatedVUs: 10,
      maxVUs: 25,
      stages: [
        { target: 1, duration: "1m" },
        { target: 10, duration: "3m" },
        { target: 25, duration: "3m" },
        { target: 1, duration: "1m" },
      ],
    },
  },
  thresholds: { http_req_failed: ["rate<0.01"], checks: ["rate>0.99"] },
  summaryTrendStats: ["avg", "med", "p(95)", "p(99)", "max"],
};
const routes = [
  "/v1/bootstrap",
  "/v1/transactions?limit=20",
  "/v1/holdings/summary",
  "/v1/finance/overview",
  "/v1/zakat/summary",
];
export default function () {
  const index = exec.scenario.iterationInTest,
    token = tokens[(exec.vu.idInTest - 1) % tokens.length],
    headers = { Authorization: "Bearer " + token };
  if (__ENV.ENABLE_SYNTHETIC_WRITES === "true" && index % 10 === 0) {
    const key = "staging-" + exec.vu.idInTest + "-" + Date.now() + "-" + index;
    const r = http.post(
      base + "/v1/transactions",
      JSON.stringify({
        type: "EXPENSE",
        category: "OTHER",
        amount: "1.00",
        currency: "BDT",
        localDate: new Date().toISOString().slice(0, 10),
        isSadaqah: false,
        description: "Synthetic staging load; remove after test",
      }),
      {
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "idempotency-key": key,
        },
        tags: { journey: "synthetic-create" },
      },
    );
    check(r, { "synthetic write completed": (r) => r.status === 200 });
    if (r.status === 200) {
      const record = r.json().data;
      const removed = http.del(
        base + "/v1/transactions/" + record.id,
        JSON.stringify({ version: record.version }),
        {
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "idempotency-key": key + "-delete",
          },
          tags: { journey: "synthetic-delete" },
        },
      );
      check(removed, { "synthetic record removed": (r) => r.status === 200 });
    }
  } else {
    const route =
      index % 50 === 0
        ? "/v1/me/export?format=json"
        : routes[index % routes.length];
    const r = http.get(base + route, {
      headers,
      tags: { journey: route.split("?")[0] },
    });
    check(r, { "successful completed read": (r) => r.status === 200 });
  }
}
export function handleSummary(data) {
  return {
    "staging-evidence/load-summary.json": JSON.stringify(data, null, 2),
  };
}
