import { z } from "zod";
import { Readable } from "node:stream";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import { ok } from "../../platform/http/schemas.js";
import { authLimit } from "../identity/identity.controller.js";
import { ExportService } from "./exports.service.js";
export function exportsRoutes(route: Register, ctx: Context) {
  const s = new ExportService(ctx);
  const query = z.object({ format: z.enum(["csv", "json"]).default("json") });
  route(
    "GET",
    "/v1/me/export",
    "Privacy",
    z.string(),
    async (req, reply) => {
      await authLimit(ctx, req);
      const { format } = query.parse(req.query);
      reply
        .header("Cache-Control", "private, no-store")
        .header(
          "Content-Disposition",
          `attachment; filename="amanah-export.${format}"`,
        )
        .type(
          format === "json"
            ? "application/json; charset=utf-8"
            : "text/csv; charset=utf-8",
        );
      return reply.send(Readable.from(s.stream(req.actor.userId, format)));
    },
    {
      querystring: query,
      raw: true,
      rawContent: { "application/json": z.unknown(), "text/csv": z.string() },
      description:
        "Authenticated bounded streaming export. Response is a file, not a JSON API envelope. JSON and CSV exports include all owned records, including soft-deleted financial rows.",
    },
  );
  route(
    "DELETE",
    "/v1/me/account",
    "Privacy",
    ok,
    async (req) => {
      await authLimit(ctx, req);
      return s.deleteAccount(
        req.actor.userId,
        z
          .object({
            proof: z.string().min(32).max(256),
            confirmation: z.literal("DELETE"),
          })
          .strict()
          .parse(req.body).proof,
      );
    },
    {
      body: z
        .object({
          proof: z.string().min(32).max(256),
          confirmation: z.literal("DELETE"),
        })
        .strict(),
    },
  );
}
