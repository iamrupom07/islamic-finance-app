import { assetsController } from "./assets.controller.js";
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
import { assetInput, assetPatch, assetView } from "./assets.schemas.js";
import { AssetService } from "./assets.service.js";
export function assetsRoutes(route: Register, ctx: Context) {
  const s = new AssetService(ctx);
  const c = assetsController(s);
  const query = paging;
  const deleteBody = z.object({ version }).strict();
  route("GET", "/v1/assets", "Assets", page(assetView), c.list, {
    querystring: query,
  });
  route("POST", "/v1/assets", "Assets", assetView, c.create, {
    body: assetInput,
    headers: idempotencyHeaders,
  });
  route("GET", "/v1/assets/:id", "Assets", assetView, c.get, {
    params: idParams,
  });
  route("PATCH", "/v1/assets/:id", "Assets", assetView, c.update, {
    params: idParams,
    body: assetPatch,
    headers: idempotencyHeaders,
  });
  route("DELETE", "/v1/assets/:id", "Assets", ok, c.remove, {
    params: idParams,
    body: deleteBody,
    headers: idempotencyHeaders,
  });

  return s;
}
