import { it, expect } from "vitest";
import { assessmentStatement } from "./statement.js";
import { calculateZakat } from "./zakat.engine.js";
import { preference, policy, rates, now, asset } from "../../test/fixtures.js";
it("exports the saved calculation and payment corrections as escaped readable content", () => {
  const input = calculateZakat({
    preference,
    policy,
    assets: [asset({ label: "<img src=x onerror=alert(1)>" })],
    debts: [],
    rates,
    now,
    localDate: "2026-10-26",
    maxAgeHours: 36,
  });
  const html = assessmentStatement({
    id: "statement",
    userId: "owner",
    policyVersionId: policy.id,
    status: "CLOSED",
    currency: "BDT",
    snapshot: input,
    assessedAmount: "100.00",
    recordedAmount: "20.00",
    remainingAmount: "80.00",
    paymentState: "PARTIAL",
    recordStatus: "PAID_PARTIAL",
    periodStart: null,
    periodEnd: null,
    createdAt: now.toISOString(),
    payments: [
      {
        id: "payment",
        userId: "owner",
        zakatYearId: "statement",
        amount: "80",
        effectiveAmount: "20",
        currency: "BDT",
        paidOn: "2026-10-26",
        createdAt: now.toISOString(),
        note: '<script>alert("private")</script>',
        corrections: [
          {
            id: "correction",
            replacementAmount: "20",
            reason: "Corrected external receipt",
            createdAt: now.toISOString(),
          },
        ],
      },
    ],
  });
  expect(html).not.toContain("<img src=x");
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("Corrected external receipt");
  expect(html).toContain(input.policyVersion!);
  expect(html).toContain(input.sourceAt!);
  expect(html).toContain("80.00");
  expect(html).toContain("private");
  expect(html).toContain("default-src 'none'");
});
