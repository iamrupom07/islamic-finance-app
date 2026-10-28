import "dotenv/config";
import { loadJobEnv } from "../config/env.js";
import { createDatabase } from "../platform/database/client.js";
import { ProviderHttp } from "../platform/providers/http.js";
import { RatesProvider } from "./rates.provider.js";
import { refreshRates } from "./refresh-rates.service.js";
const env = loadJobEnv();
const db = createDatabase(env.DATABASE_URL);
try {
  const result = await refreshRates(
    db,
    new RatesProvider(new ProviderHttp(env.PROVIDER_TIMEOUT_MS)),
  );
  console.info(JSON.stringify(result));
} catch {
  console.error("RATE_REFRESH_FAILED");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
