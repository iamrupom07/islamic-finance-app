import { zakatSummary } from "./zakat.schemas.js";
import type { ZakatService } from "./zakat.service.js";
export function escapeHtml(value: unknown) {
  return String(value ?? "Unavailable").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function assessmentStatement(
  record: Awaited<ReturnType<ZakatService["detail"]>>,
) {
  const s = zakatSummary.parse(record.snapshot),
    e = escapeHtml;
  const rows = (items: [string, unknown][]) =>
    items
      .map(([k, v]) => `<tr><th scope="row">${e(k)}</th><td>${e(v)}</td></tr>`)
      .join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Amanah assessment statement</title><style>body{font:16px/1.6 system-ui,sans-serif;margin:2rem auto;padding:0 1rem;max-width:960px;color:#182322}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #b8c4bf;text-align:left;vertical-align:top;padding:.6rem;overflow-wrap:anywhere}th{font-weight:600}section{overflow-x:auto}h1,h2{font-weight:600}@media print{body{margin:0}thead{display:table-header-group}tr{break-inside:avoid}}</style><h1>Amanah assessment statement</h1><p>Saved assessment; current prices are not substituted. This statement records an estimate and payments declared outside Amanah; no money was transferred.</p><table>${rows(
    [
      ["Assessment", record.id],
      ["Created", record.createdAt],
      [
        "Valuation date",
        s.valuationDate ?? "Not retained in this legacy assessment",
      ],
      ["Basis", s.valuationBasis ?? "Saved assessment snapshot"],
      ["Currency", record.currency],
      ["Status", s.status],
      ["Policy version", s.policyVersion],
      [
        "Policy sources",
        s.policyDetails?.sourceNotes ??
          "Not retained in this legacy assessment",
      ],
      ["Policy reviewer", s.policyDetails?.reviewedBy],
      ["Policy approval", s.policyDetails?.approvedAt],
      [
        "Policy treatment",
        s.policyDetails
          ? JSON.stringify(s.policyDetails.rules)
          : "Not retained in this legacy assessment",
      ],
      ["Nisab metal quote USD per troy ounce", s.nisabQuote?.usdPerTroyOz],
      ["Nisab FX rate USD to assessment currency", s.nisabQuote?.fxRateApplied],
      ["Grams per troy ounce", s.nisabQuote?.troyOunceGrams],
      ["Rate set", s.rateSetId],
      ["Quote provider", s.source],
      ["Source timestamp", s.sourceAt],
      ["Eligible assets", s.eligibleAssets],
      ["Eligible receivables", s.eligibleReceivables],
      ["Eligible liabilities", s.eligibleLiabilities],
      ["Net eligible wealth", s.netEligibleWealth],
      ["Nisab standard", s.nisabStandard],
      ["Nisab grams", s.nisabGrams],
      ["Nisab value", s.nisabValue],
      ["Annual rate", s.annualRate],
      ["Assessed amount", record.assessedAmount],
      ["Effective payments", record.recordedAmount],
      ["Remaining", record.remainingAmount],
      ["Period starts", s.period?.start],
      ["Period ends", s.period?.end],
      ["Calendar method", s.period?.method],
      ["Snapshot fingerprint", s.fingerprint],
    ],
  )}</table><h2>Declared inputs and treatment</h2><section><table><thead><tr><th>Input</th><th>Kind</th><th>Original amount/currency</th><th>Converted</th><th>Valuation</th><th>Weight/purity/quote/FX</th><th>Included</th><th>Reason</th><th>Source timestamp</th></tr></thead><tbody>${s.lines.map((l) => `<tr>${[l.label, l.kind, `${l.originalAmount ?? "Unavailable"} ${l.originalCurrency}`, l.convertedAmount, l.valuationMethod, `Weight g: ${l.weightGrams ?? "Not retained / not applicable"}; purity: ${l.purity ?? "Not retained / not applicable"}; USD/ozt: ${l.metalUsdPerTroyOz ?? "Not retained / not applicable"}; FX: ${l.fxRateApplied ?? "Not retained / not applicable"}`, l.included ? "Yes" : "No", l.reason, l.sourceAt].map((v) => `<td>${e(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></section><h2>Payments and correction history</h2>${
    record.payments.length
      ? record.payments
          .map(
            (p) =>
              `<table>${rows([
                ["Payment", p.id],
                ["Paid on", p.paidOn],
                ["Original amount", p.amount],
                ["Effective amount", p.effectiveAmount],
                ["Currency", p.currency],
                ["Note", p.note],
              ])}</table><ul>${p.corrections.map((c) => `<li>${e(c.createdAt)}: replacement ${e(c.replacementAmount)}; ${e(c.reason)}</li>`).join("")}</ul>`,
          )
          .join("")
      : "<p>No payment records.</p>"
  }<h2>Scope and limitations</h2><ul>${s.reasons.map((r) => `<li>${e(r)}</li>`).join("")}</ul><p>${e(s.disclaimer)}</p></html>`;
}
