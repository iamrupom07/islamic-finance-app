import type { Env } from "../config/env.js";
import type { Database } from "./database/client.js";
import type { TokenTools } from "./auth/tokens.js";
import type { MailPort } from "./providers/mail.js";
import type { CachePort, RateLimiterPort } from "./cache/ports.js";
export interface Context {
  env: Env;
  db: Database;
  tokens: TokenTools;
  mail: MailPort;
  cache: CachePort;
  limiter: RateLimiterPort;
  now: () => Date;
}
