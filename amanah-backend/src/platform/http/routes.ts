import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { errorSchema, envelope } from "./schemas.js";
import { actorContext } from "../auth/actor-context.js";
import { authRequired } from "./errors.js";
import type { Context } from "../context.js";
export type Actor = {
  userId: string;
  sessionId: string;
  authenticatedAt: number;
};
declare module "fastify" {
  interface FastifyRequest {
    actor: Actor;
  }
}
export function registrar(app: FastifyInstance, ctx: Context) {
  async function authenticate(req: FastifyRequest) {
    const bearer = req.headers.authorization;
    if (!bearer?.startsWith("Bearer ")) throw authRequired();
    let userId: string, sessionId: string, authenticatedAt: number;
    try {
      const { payload } = await ctx.tokens.verify(bearer.slice(7));
      if (typeof payload.sub !== "string" || typeof payload.sid !== "string")
        throw authRequired();
      userId = payload.sub;
      sessionId = payload.sid;
      authenticatedAt = payload.iat ?? 0;
    } catch {
      throw authRequired();
    }
    const session = await ctx.db.session.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: ctx.now() },
      },
      select: { id: true },
    });
    if (!session) throw authRequired();
    req.actor = { userId, sessionId, authenticatedAt };
  }
  return function route<S extends z.ZodType>(
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
    url: string,
    tag: string,
    response: S,
    handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>,
    input: {
      body?: z.ZodType;
      querystring?: z.ZodType;
      params?: z.ZodType;
      headers?: z.ZodType;
      public?: boolean;
      raw?: boolean;
      rawContent?: Record<string, z.ZodType>;
      description?: string;
    } = {},
  ) {
    const {
      public: publicRoute,
      raw,
      rawContent,
      description,
      ...schemas
    } = input;
    app.route({
      method,
      url,
      schema: {
        ...schemas,
        tags: [tag],
        description,
        security: publicRoute ? [] : [{ bearerAuth: [] }],
        response: {
          200: rawContent
            ? {
                content: Object.fromEntries(
                  Object.entries(rawContent).map(([type, schema]) => [
                    type,
                    { schema },
                  ]),
                ),
              }
            : raw
              ? response
              : envelope(response),
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
          422: errorSchema,
          429: errorSchema,
          503: errorSchema,
        },
      },
      preHandler: publicRoute ? undefined : authenticate,
      handler: async (req, reply) => {
        reply.header("Cache-Control", "private, no-store");
        const data = await actorContext.run(req.actor, () =>
          handler(req, reply),
        );
        if (reply.sent) return;
        return raw ? data : { data, meta: { requestId: req.id } };
      },
    });
  };
}
export type Register = ReturnType<typeof registrar>;
