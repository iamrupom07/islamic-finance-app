import "dotenv/config";
import { createDatabase } from "../src/platform/database/client.js";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");
const db = createDatabase(url);
const now = new Date();
try {
  await db.oAuthChallenge.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.oneTimeToken.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86400000) } },
  });
  await db.session.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86400000) } },
  });
  console.log(
    "Expired identity records removed. Financial idempotency and audit records are deliberately retained until account erasure or an approved retention migration.",
  );
} finally {
  await db.$disconnect();
}
