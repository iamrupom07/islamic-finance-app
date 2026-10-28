import { debtsController } from "./debts.controller.js";
import { z } from "zod";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import {
  idParams,
  idempotencyHeaders,
  page,
  paging,
  version,
  ok,
} from "../../platform/http/schemas.js";
import {
  debtInput,
  debtPatch,
  debtView,
  debtEventView,
} from "./debts.schemas.js";
import { DebtService } from "./debts.service.js";
export function debtsRoutes(route: Register, ctx: Context) {
  const s = new DebtService(ctx);
  const c = debtsController(s);
  const query = paging.extend({
    direction: z.enum(["I_OWE", "OWED_TO_ME"]).optional(),
  });
  const repayment = z
    .object({
      version,
      amount: z
        .string()
        .regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/)
        .refine((v) => /[1-9]/.test(v)),
      paidOn: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine(
          (v) =>
            !Number.isNaN(Date.parse(v)) &&
            new Date(v).toISOString().slice(0, 10) === v,
        ),
      note: z.string().trim().max(500).optional(),
    })
    .strict();
  route(
    "POST",
    "/v1/debts/:id/repayments",
    "Debts",
    debtView,
    (req) =>
      s.repay(
        req.actor.userId,
        idParams.parse(req.params).id,
        idempotencyHeaders.parse(req.headers)["idempotency-key"],
        repayment.parse(req.body),
      ),
    { params: idParams, headers: idempotencyHeaders, body: repayment },
  );
  const deleteBody = z.object({ version }).strict();
  route("GET", "/v1/debts", "Debts", page(debtView), c.list, {
    querystring: query,
  });
  route("POST", "/v1/debts", "Debts", debtView, c.create, {
    body: debtInput,
    headers: idempotencyHeaders,
  });
  route("GET", "/v1/debts/:id", "Debts", debtView, c.get, { params: idParams });
  route("PATCH", "/v1/debts/:id", "Debts", debtView, c.update, {
    params: idParams,
    body: debtPatch,
    headers: idempotencyHeaders,
  });
  route("DELETE", "/v1/debts/:id", "Debts", ok, c.remove, {
    params: idParams,
    body: deleteBody,
    headers: idempotencyHeaders,
  });
  route("PATCH", "/v1/debts/:id/settle", "Debts", debtView, c.settle, {
    params: idParams,
    body: deleteBody,
    headers: idempotencyHeaders,
  });
  route(
    "GET",
    "/v1/debts/:id/events",
    "Debts",
    z.array(debtEventView),
    c.events,
    { params: idParams },
  );
  return s;
}
