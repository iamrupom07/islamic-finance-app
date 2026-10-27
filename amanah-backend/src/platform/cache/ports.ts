export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
}
export type LimitResult = {
  state: "ALLOW" | "DENY" | "UNAVAILABLE";
  retryAfter: number;
};
export interface RateLimiterPort {
  check(identifier: string): Promise<LimitResult>;
}
export const noCache: CachePort = {
  get: async () => null,
  set: async () => {},
};
export class DevelopmentLimiter implements RateLimiterPort {
  private buckets = new Map<string, { count: number; until: number }>();
  async check(key: string): Promise<LimitResult> {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b && this.buckets.size >= 10000)
      return { state: "UNAVAILABLE", retryAfter: 2 };
    if (!b || b.until < now) {
      b = { count: 0, until: now + 900000 };
      this.buckets.set(key, b);
    }
    if (this.buckets.size > 10000)
      for (const [k, v] of this.buckets)
        if (v.until < now) this.buckets.delete(k);
    b.count++;
    return {
      state: b.count <= 20 ? "ALLOW" : "DENY",
      retryAfter: Math.max(1, Math.ceil((b.until - now) / 1000)),
    };
  }
}
