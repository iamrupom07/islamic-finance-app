import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
export function createDatabase(url: string) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      max: 3,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    }),
    transactionOptions: { maxWait: 5000, timeout: 10000 },
  });
}
export type Database = ReturnType<typeof createDatabase>;
