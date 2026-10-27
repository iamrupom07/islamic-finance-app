import type { FastifyRequest } from "fastify";
import type { Context } from "../../platform/context.js";
import { digest } from "../../platform/http/idempotency.js";
import { AppError, unavailable } from "../../platform/http/errors.js";
export async function authLimit(ctx: Context, req: FastifyRequest) {
  const body = req.body as { email?: string } | undefined;
  const network = digest(ctx.env.REFRESH_TOKEN_PEPPER + req.ip);
  const identifiers = [`network:${network}`];
  if (body?.email)
    identifiers.push(
      `account:${digest(ctx.env.REFRESH_TOKEN_PEPPER + body.email.toLowerCase())}`,
    );
  if (req.actor?.userId)
    identifiers.push(
      `user:${digest(ctx.env.REFRESH_TOKEN_PEPPER + req.actor.userId)}`,
    );
  for (const identifier of identifiers) {
    const result = await ctx.limiter.check(identifier);
    if (result.state === "UNAVAILABLE")
      throw unavailable("Please try signing in again shortly.");
    if (result.state === "DENY")
      throw new AppError(
        429,
        "RATE_LIMITED",
        `Too many attempts. Try again in ${result.retryAfter} seconds.`,
        { retryAfter: String(result.retryAfter) },
      );
  }
}
