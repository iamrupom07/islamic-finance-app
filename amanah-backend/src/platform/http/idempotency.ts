import { authorizeWrite } from "../auth/actor-context.js";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { Database } from "../database/client.js";
import { AppError } from "./errors.js";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const jsonSafe = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function stable(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  return (
    "{" +
    Object.entries(v)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, value]) => JSON.stringify(k) + ":" + stable(value))
      .join(",") +
    "}"
  );
}
export async function writeOnce<T>(
  db: Database,
  userId: string,
  operation: string,
  key: string,
  body: unknown,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const requestHash = digest(stable(body));
  return db.$transaction(async (tx) => {
    await authorizeWrite(tx, userId);
    // An xact advisory lock serializes just this account/operation/key across instances.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + operation + key},0))::text`;
    const prior = await tx.idempotencyRecord.findUnique({
      where: { userId_operation_key: { userId, operation, key } },
    });
    if (prior) {
      if (prior.requestHash !== requestHash)
        throw new AppError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This retry key was used with different data.",
        );
      return prior.response as T;
    }
    const result = jsonSafe(await work(tx));
    await tx.idempotencyRecord.create({
      data: {
        userId,
        operation,
        key,
        requestHash,
        response: result as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    return result;
  });
}
export async function audit(
  tx: Prisma.TransactionClient,
  pepper: string,
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
) {
  await tx.auditEvent.create({
    data: { actorHash: digest(pepper + userId), entityType, entityId, action },
  });
}
