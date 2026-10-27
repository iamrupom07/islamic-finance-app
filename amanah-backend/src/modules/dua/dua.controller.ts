import type { FastifyRequest } from "fastify";
import type { DuaService } from "./dua.service.js";
import { duaParams } from "./dua.schemas.js";
export const duaController = (s: DuaService) => ({
  list: (r: FastifyRequest) => s.list(r.actor.userId),
  save: (r: FastifyRequest) =>
    s.change(r.actor.userId, duaParams.parse(r.params).duaId, true),
  remove: (r: FastifyRequest) =>
    s.change(r.actor.userId, duaParams.parse(r.params).duaId, false),
});
