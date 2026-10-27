import "dotenv/config";
import { loadEnv } from "../src/config/env.js";
import { createDatabase } from "../src/platform/database/client.js";
import { loadContent } from "../src/modules/catalog/catalog.service.js";
const env = loadEnv();
if (env.NODE_ENV !== "production")
  throw new Error("Production configuration required.");
if (!loadContent(env.CONTENT_BUNDLE_PATH))
  throw new Error("BLOCKED: reviewed content bundle required.");
const db = createDatabase(env.DATABASE_URL);
try {
  if (
    !(await db.zakatPolicyVersion.count({
      where: {
        status: "APPROVED",
        reviewedBy: { not: null },
        approvedAt: { not: null },
      },
    }))
  )
    throw new Error("BLOCKED: approved religious policy required.");
  const recent = await db.jobExecution.count({
    where: {
      jobType: "REFRESH_RATES",
      status: "SUCCEEDED",
      startedAt: { gt: new Date(Date.now() - 72 * 3600000) },
    },
  });
  if (recent < 2)
    throw new Error("BLOCKED: evidence of two recent rate refreshes required.");
  console.log(
    "Automated source/config gates satisfied. Device, security, restoration, legal and deployment evidence still require review.",
  );
} finally {
  await db.$disconnect();
}
