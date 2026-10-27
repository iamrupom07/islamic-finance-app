import { z } from "zod";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import { ok } from "../../platform/http/schemas.js";
import { duaParams, favoriteView } from "./dua.schemas.js";
import { DuaService } from "./dua.service.js";
import { duaController } from "./dua.controller.js";
export function duaRoutes(route: Register, ctx: Context) {
  const c = duaController(new DuaService(ctx));
  route("GET", "/v1/dua/favorites", "Dua", z.array(favoriteView), c.list);
  route("PUT", "/v1/dua/favorites/:duaId", "Dua", ok, c.save, {
    params: duaParams,
  });
  route("DELETE", "/v1/dua/favorites/:duaId", "Dua", ok, c.remove, {
    params: duaParams,
  });
}
