import { z } from "zod";
import type { FastifyRequest } from "fastify";
import {
  idParams,
  idempotencyHeaders,
  version,
} from "../../platform/http/schemas.js";
import {
  transactionInput,
  transactionPatch,
  transactionQuery,
} from "./transactions.schemas.js";
import type { TransactionsService } from "./transactions.service.js";
const key = (h: unknown) => idempotencyHeaders.parse(h)["idempotency-key"];

export const transactionsController = (s: TransactionsService) => ({
  list: (req: FastifyRequest) =>
    s.list(req.actor.userId, transactionQuery.parse(req.query)),
  create: (req: FastifyRequest) =>
    s.create(
      req.actor.userId,
      key(req.headers),
      transactionInput.parse(req.body),
    ),
  get: (req: FastifyRequest) =>
    s.get(req.actor.userId, idParams.parse(req.params).id),
  update: (req: FastifyRequest) =>
    s.update(
      req.actor.userId,
      idParams.parse(req.params).id,
      key(req.headers),
      transactionPatch.parse(req.body),
    ),
  remove: (req: FastifyRequest) =>
    s.remove(
      req.actor.userId,
      idParams.parse(req.params).id,
      key(req.headers),
      z.object({ version }).strict().parse(req.body).version,
    ),
});
