import { z } from "zod";
import type { FastifyRequest } from "fastify";
import {
  idParams,
  idempotencyHeaders,
  paging,
  version,
} from "../../platform/http/schemas.js";
import { debtInput, debtPatch } from "./debts.schemas.js";
import type { DebtService } from "./debts.service.js";
const key = (h: unknown) => idempotencyHeaders.parse(h)["idempotency-key"];
const deleteBody = z.object({ version }).strict();
const query = paging.extend({
  direction: z.enum(["I_OWE", "OWED_TO_ME"]).optional(),
});
export const debtsController = (s: DebtService) => ({
  list: (req: FastifyRequest) =>
    s.list(req.actor.userId, query.parse(req.query)),
  create: (req: FastifyRequest) =>
    s.create(req.actor.userId, key(req.headers), debtInput.parse(req.body)),
  get: (req: FastifyRequest) =>
    s.get(req.actor.userId, idParams.parse(req.params).id),
  update: (req: FastifyRequest) =>
    s.update(
      req.actor.userId,
      idParams.parse(req.params).id,
      key(req.headers),
      debtPatch.parse(req.body),
    ),
  remove: (req: FastifyRequest) =>
    s.remove(
      req.actor.userId,
      idParams.parse(req.params).id,
      key(req.headers),
      deleteBody.parse(req.body).version,
    ),
  settle: (req: FastifyRequest) =>
    s.settle(
      req.actor.userId,
      idParams.parse(req.params).id,
      key(req.headers),
      deleteBody.parse(req.body).version,
    ),
  events: (req: FastifyRequest) =>
    s.events(req.actor.userId, idParams.parse(req.params).id),
});
