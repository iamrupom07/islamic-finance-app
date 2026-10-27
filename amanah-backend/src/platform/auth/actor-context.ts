import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma } from "@prisma/client";
import { authRequired } from "../http/errors.js";
export interface RequestActor {
  userId: string;
  sessionId: string;
  authenticatedAt: number;
}
export const actorContext = new AsyncLocalStorage<RequestActor | undefined>();
export async function authorizeWrite(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const actor = actorContext.getStore();
  if (!actor || actor.userId !== userId) throw authRequired();
  // SHARE locks order revocation against the commit of a sensitive mutation.
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM "Session" WHERE id=${actor.sessionId}::uuid AND "userId"=${userId}::uuid AND "revokedAt" IS NULL AND "expiresAt">CURRENT_TIMESTAMP FOR SHARE`;
  if (!rows.length) throw authRequired();
}
