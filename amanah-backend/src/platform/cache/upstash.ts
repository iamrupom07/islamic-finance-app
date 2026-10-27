import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import type { CachePort, RateLimiterPort, LimitResult } from "./ports.js";
import type { Env } from "../../config/env.js";
export function interpretLimit(
  result: { success: boolean; reason?: string; reset: number },
  now = Date.now(),
): LimitResult {
  if (result.reason === "timeout")
    return { state: "UNAVAILABLE", retryAfter: 2 };
  return {
    state: result.success ? "ALLOW" : "DENY",
    retryAfter: Math.max(1, Math.ceil((result.reset - now) / 1000)),
  };
}
export function upstashAdapters(env: Env) {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
    retry: false,
    signal: () => AbortSignal.timeout(env.REDIS_TIMEOUT_MS),
  });
  const limit = new Ratelimit({
    redis,
    prefix: `amanah:${env.NODE_ENV}:rl:v1`,
    limiter: Ratelimit.slidingWindow(20, "15 m"),
    analytics: false,
    timeout: env.REDIS_TIMEOUT_MS,
    ephemeralCache: false,
  });
  const limiter: RateLimiterPort = {
    async check(identifier) {
      try {
        const r = await limit.limit(identifier);
        await r.pending;
        return interpretLimit(r);
      } catch {
        return { state: "UNAVAILABLE", retryAfter: 2 };
      }
    },
  };
  function allowed(key: string) {
    if (!/^(prayer|catalog|rates):v\d:/.test(key))
      throw new Error("PRIVATE_CACHE_FORBIDDEN");
    return `amanah:${env.NODE_ENV}:${key}`;
  }
  const cache: CachePort = {
    async get<T>(key: string) {
      try {
        return await redis.get<T>(allowed(key));
      } catch {
        return null;
      }
    },
    async set(key, value, ttl) {
      try {
        await redis.set(allowed(key), value, {
          ex: Math.min(
            86400,
            Math.max(1, ttl - Math.floor(Math.random() * 10)),
          ),
        });
      } catch {
        /* Public cache is best-effort. */
      }
    },
  };
  return { cache, limiter };
}
