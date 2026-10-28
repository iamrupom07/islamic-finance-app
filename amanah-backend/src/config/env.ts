import { z } from "zod";
const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");
const common = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  RATE_MAX_AGE_HOURS: z.coerce.number().int().min(1).max(72).default(36),
  PROVIDER_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(500)
    .max(10000)
    .default(4000),
});
const api = common
  .extend({
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    JWT_SIGNING_PRIVATE_KEY: z.string().min(64),
    JWT_SIGNING_PUBLIC_KEY: z.string().min(64),
    JWT_PREVIOUS_PUBLIC_KEYS: z.string().default("{}"),
    JWT_KEY_ID: z.string().min(1).default("amanah-1"),
    JWT_ISSUER: z.string().default("amanah-api"),
    JWT_AUDIENCE: z.string().default("amanah-mobile"),
    REFRESH_TOKEN_PEPPER: z.string().min(32),
    CURSOR_SECRET: z.string().min(32),
    ENABLE_REDIS: bool,
    ENABLE_R2_UPLOADS: z.literal("false").default("false"),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    REDIS_TIMEOUT_MS: z.coerce.number().int().min(100).max(3000).default(800),
    MAIL_PROVIDER: z
      .enum(["disabled", "development", "resend"])
      .default("disabled"),
    MAIL_PROVIDER_API_KEY: z.string().optional(),
    MAIL_SENDER_ADDRESS: z.email().optional(),
    DEV_MAIL_OUTBOX_DIR: z.string().default(".local-mail"),
    APP_LINK_ORIGIN: z.string().default("amanah://"),
    CORS_ORIGINS: z.string().default(""),
    TRUSTED_PROXY_CIDRS: z.string().default(""),
    GOOGLE_ALLOWED_CLIENT_IDS: z.string().default(""),
    APPLE_ALLOWED_CLIENT_IDS: z.string().default(""),
    CONTENT_BUNDLE_PATH: z.string().optional(),
    PRAYER_POLICY_PATH: z.string().optional(),
    LOG_LEVEL: z
      .enum(["silent", "error", "warn", "info", "debug"])
      .default("info"),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (
      v.ENABLE_REDIS &&
      (!v.UPSTASH_REDIS_REST_URL?.startsWith("https://") ||
        !v.UPSTASH_REDIS_REST_TOKEN)
    )
      issue("ENABLE_REDIS", "HTTPS Upstash URL and token required.");
    if (v.NODE_ENV === "production") {
      if (!v.ENABLE_REDIS)
        issue(
          "ENABLE_REDIS",
          "Production requires distributed abuse protection.",
        );
      if (v.MAIL_PROVIDER !== "resend")
        issue(
          "MAIL_PROVIDER",
          "Production requires a verification mail provider.",
        );
      if (
        !v.DATABASE_URL.includes("sslmode=require") &&
        !v.DATABASE_URL.includes("sslmode=verify-full")
      )
        issue("DATABASE_URL", "PostgreSQL TLS required.");
    }
    if (
      v.MAIL_PROVIDER === "resend" &&
      (!v.MAIL_PROVIDER_API_KEY || !v.MAIL_SENDER_ADDRESS)
    )
      issue("MAIL_PROVIDER", "Mail API key and verified sender required.");
    if (!/^(amanah:\/\/|https:\/\/)/.test(v.APP_LINK_ORIGIN))
      issue("APP_LINK_ORIGIN", "Use an approved application link origin.");
  });
export type Env = z.infer<typeof api>;
const defined = (input: NodeJS.ProcessEnv) =>
  Object.fromEntries(Object.entries(input).filter(([, v]) => v !== ""));
export const loadEnv = (input: NodeJS.ProcessEnv = process.env): Env =>
  api.parse(defined(input));
export const loadJobEnv = (input: NodeJS.ProcessEnv = process.env) =>
  common.parse(defined(input));
