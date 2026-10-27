import { z } from "zod";
import type { FastifyRequest } from "fastify";
import {
  idParams,
  idempotencyHeaders,
  paging,
  version,
} from "../../platform/http/schemas.js";
import { assetInput, assetPatch } from "./assets.schemas.js";
import type { AssetService } from "./assets.service.js";
const key = (h: unknown) => idempotencyHeaders.parse(h)["idempotency-key"];
const deleteBody = z.object({ version }).strict();
const query = paging;
export const assetsController = (s: AssetService) => ({
  list: (req: FastifyRequest) =>
    s.list(req.actor.userId, query.parse(req.query)),
  create: (req: FastifyRequest) =>
    s.create(req.actor.userId, key(req.headers), assetInput.parse(req.body)),
  get: (req: FastifyRequest) =>
    s.get(req.actor.userId, idParams.parse(req.params).id),
  update: (req: FastifyRequest) =>
    s.update(
      req.actor.userId,
      idParams.parse(req.params).id,
      key(req.headers),
      assetPatch.parse(req.body),
    ),
  remove: (req: FastifyRequest) =>
    s.remove(
      req.actor.userId,
      idParams.parse(req.params).id,
      key(req.headers),
      deleteBody.parse(req.body).version,
    ),
});
