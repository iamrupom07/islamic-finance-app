import { transactionsController } from "./transactions.controller.js";
import { z } from "zod";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import {
  idParams,
  idempotencyHeaders,
  page,
  ok,
  version,
} from "../../platform/http/schemas.js";
import {
  transactionInput,
  transactionPatch,
  transactionQuery,
  transactionView,
} from "./transactions.schemas.js";
import { TransactionsService } from "./transactions.service.js";
export function transactionsRoutes(route: Register, ctx: Context) {
  const s = new TransactionsService(ctx);
  const c = transactionsController(s);
  route(
    "GET",
    "/v1/transactions",
    "Transactions",
    page(transactionView),
    c.list,
    { querystring: transactionQuery },
  );
  route("POST", "/v1/transactions", "Transactions", transactionView, c.create, {
    body: transactionInput,
    headers: idempotencyHeaders,
  });
  route("GET", "/v1/transactions/:id", "Transactions", transactionView, c.get, {
    params: idParams,
  });
  route(
    "PATCH",
    "/v1/transactions/:id",
    "Transactions",
    transactionView,
    c.update,
    { params: idParams, body: transactionPatch, headers: idempotencyHeaders },
  );
  route("DELETE", "/v1/transactions/:id", "Transactions", ok, c.remove, {
    params: idParams,
    body: z.object({ version }).strict(),
    headers: idempotencyHeaders,
  });
  return s;
}
