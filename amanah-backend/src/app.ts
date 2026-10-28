import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import {
  validatorCompiler,
  serializerCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { Context } from "./platform/context.js";
import { createDatabase } from "./platform/database/client.js";
import { tokenTools } from "./platform/auth/tokens.js";
import { mailProvider } from "./platform/providers/mail.js";
import { noCache, DevelopmentLimiter } from "./platform/cache/ports.js";
import { upstashAdapters } from "./platform/cache/upstash.js";
import { registrar } from "./platform/http/routes.js";
import { AppError } from "./platform/http/errors.js";
import { loadEnv, type Env } from "./config/env.js";
import { identityRoutes } from "./modules/identity/identity.routes.js";
import { preferencesRoutes } from "./modules/preferences/preferences.routes.js";
import { transactionsRoutes } from "./modules/transactions/transactions.routes.js";
import { assetsRoutes } from "./modules/assets/assets.routes.js";
import { debtsRoutes } from "./modules/debts/debts.routes.js";
import { zakatRoutes } from "./modules/zakat/zakat.routes.js";
import { prayerRoutes } from "./modules/prayer/prayer.routes.js";
import { quranRoutes } from "./modules/quran/quran.routes.js";
import { duaRoutes } from "./modules/dua/dua.routes.js";
import { exportsRoutes } from "./modules/exports/exports.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
export async function createApp(
  options: { env?: Env; overrides?: Partial<Context> } = {},
) {
  const env = options.env ?? loadEnv();
  const distributed = env.ENABLE_REDIS
    ? upstashAdapters(env)
    : { cache: noCache, limiter: new DevelopmentLimiter() };
  const ctx: Context = {
    env,
    db: createDatabase(env.DATABASE_URL),
    tokens: tokenTools(env),
    mail: mailProvider(env),
    ...distributed,
    now: () => new Date(),
    ...options.overrides,
  };
  const app = Fastify({
    bodyLimit: 32768,
    requestTimeout: 25000,
    trustProxy: env.TRUSTED_PROXY_CIDRS
      ? env.TRUSTED_PROXY_CIDRS.split(",")
      : false,
    genReqId: () => randomUUID(),
    disableRequestLogging: true,
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.body",
          "res.body",
          "password",
          "token",
          "accessToken",
          "refreshToken",
          "databaseUrl",
        ],
        remove: true,
      },
    },
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler((rawError, req, reply) => {
    const error = rawError as Error & {
      validation?: unknown;
      statusCode?: number;
      code?: string;
    };
    let status = 500,
      code = "INTERNAL_ERROR",
      message = "Something went wrong. Please try again.",
      fields: Record<string, string> | undefined;
    if (error instanceof AppError) {
      status = error.status;
      code = error.code;
      message = error.message;
      fields = error.fields;
    } else if (error instanceof z.ZodError || error.validation) {
      status = 400;
      code = "VALIDATION_ERROR";
      message = "Please check the highlighted fields.";
      if (error instanceof z.ZodError)
        fields = Object.fromEntries(
          error.issues.map((i) => [i.path.join("."), i.message]),
        );
    } else if ((error as { code?: string }).code === "P2002") {
      status = 409;
      code = "CONFLICT";
      message = "This operation conflicts with an existing record.";
    } else if (
      ["P1001", "P1002", "P2024", "ECONNREFUSED"].includes(
        (error as { code?: string }).code ?? "",
      )
    ) {
      status = 503;
      code = "SERVICE_UNAVAILABLE";
      message = "The service is temporarily unavailable.";
    } else if (
      (error.statusCode ?? 0) >= 400 &&
      (error.statusCode ?? 0) < 500
    ) {
      status = error.statusCode!;
      code = status === 413 ? "PAYLOAD_TOO_LARGE" : "VALIDATION_ERROR";
      message = "This request could not be processed.";
    }
    // Never log error objects: drivers/provider errors can include credentials or financial parameters.
    req.log[status >= 500 ? "error" : "info"](
      { requestId: req.id, status, code },
      "request_rejected",
    );
    if (status === 429) reply.header("Retry-After", fields?.retryAfter ?? "60");
    reply
      .code(status)
      .header("Cache-Control", "no-store")
      .send({
        error: { code, message, ...(fields ? { fields } : {}) },
        meta: { requestId: req.id },
      });
  });
  app.addHook("onRequest", async (req, reply) => {
    reply.header("X-Request-Id", req.id);
  });
  app.addHook("onResponse", async (req, reply) => {
    req.log.info(
      {
        requestId: req.id,
        method: req.method,

        route: req.routeOptions.url,
        status: reply.statusCode,
        durationMs: reply.elapsedTime,
      },
      "request_completed",
    );
  });
  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(",") : false,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "Idempotency-Key",
      "idempotency-key",
      "Accept",
    ],
    exposedHeaders: ["Retry-After", "X-Request-Id"],
    credentials: false,
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "Amanah API", version: "1.0.0" },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  app.get(
    "/health/live",
    { schema: { response: { 200: z.object({ ok: z.literal(true) }) } } },
    async () => ({ ok: true }),
  );
  app.get(
    "/healthz",
    { schema: { response: { 200: z.object({ ok: z.literal(true) }) } } },
    async () => ({ ok: true }),
  );
  const route = registrar(app, ctx);
  identityRoutes(route, ctx);
  preferencesRoutes(route, ctx);
  const tx = transactionsRoutes(route, ctx);
  assetsRoutes(route, ctx);
  debtsRoutes(route, ctx);
  const zakat = zakatRoutes(route, ctx);
  const prayer = prayerRoutes(route, ctx);
  quranRoutes(route, ctx);
  duaRoutes(route, ctx);
  exportsRoutes(route, ctx);
  dashboardRoutes(route, ctx, tx, zakat, prayer);
  app.get("/v1/openapi.json", async () => app.swagger());
  app.setNotFoundHandler((req, reply) => {
    return reply.code(404).send({
      error: { code: "NOT_FOUND", message: "This route is unavailable." },
      meta: { requestId: req.id },
    });
  });
  app.addHook("onClose", async () => ctx.db.$disconnect());
  await app.ready();
  return { app, ctx };
}
