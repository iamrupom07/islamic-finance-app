import { z } from "zod";
import { assessmentStatement } from "./statement.js";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import {
  idParams,
  ok,
  idempotencyHeaders,
  page,
  paging,
} from "../../platform/http/schemas.js";
import {
  zakatSummary,
  paymentInput,
  paymentView,
  historyView,
  correctionInput,
} from "./zakat.schemas.js";
import { ZakatService } from "./zakat.service.js";
export function zakatRoutes(route: Register, ctx: Context) {
  const s = new ZakatService(ctx);
  route("GET", "/v1/zakat/summary", "Zakat", zakatSummary, (req) =>
    s.summary(req.actor.userId),
  );
  route(
    "POST",
    "/v1/zakat/payments",
    "Zakat",
    paymentView,
    (req) =>
      s.payment(
        req.actor.userId,
        idempotencyHeaders.parse(req.headers)["idempotency-key"],
        paymentInput.parse(req.body),
      ),
    {
      body: paymentInput,
      headers: idempotencyHeaders,
      description:
        "Records money paid outside Amanah. This operation never moves money.",
    },
  );
  route(
    "GET",
    "/v1/zakat/history",
    "Zakat",
    page(historyView),
    (req) => s.history(req.actor.userId, paging.parse(req.query)),
    { querystring: paging },
  );
  route(
    "GET",
    "/v1/zakat/history/:id",
    "Zakat",
    historyView.extend({
      snapshot: zakatSummary,
      payments: z.array(paymentView),
    }),
    (req) => s.detail(req.actor.userId, idParams.parse(req.params).id),
    { params: idParams },
  );
  route(
    "POST",
    "/v1/zakat/payments/:id/corrections",
    "Zakat",
    ok,
    (req) =>
      s.correctPayment(
        req.actor.userId,
        idParams.parse(req.params).id,
        idempotencyHeaders.parse(req.headers)["idempotency-key"],
        correctionInput.parse(req.body),
      ),
    { params: idParams, headers: idempotencyHeaders, body: correctionInput },
  );
  route(
    "GET",
    "/v1/zakat/history/:id/statement",
    "Zakat",
    z.string(),
    async (req, reply) => {
      const record = await s.detail(
        req.actor.userId,
        idParams.parse(req.params).id,
      );
      reply
        .header("Cache-Control", "private, no-store")
        .header(
          "Content-Disposition",
          'attachment; filename="amanah-assessment.html"',
        )
        .type("text/html; charset=utf-8");
      return reply.send(assessmentStatement(record));
    },
    {
      params: idParams,
      raw: true,
      rawContent: { "text/html": z.string() },
      description:
        "Private readable HTML statement of the immutable assessment and effective payment correction history.",
    },
  );
  return s;
}
