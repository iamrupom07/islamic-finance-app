import { z } from "zod";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import {
  idParams,
  idempotencyHeaders,
  page,
  paging,
} from "../../platform/http/schemas.js";
import {
  zakatSummary,
  paymentInput,
  paymentView,
  historyView,
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
  return s;
}
