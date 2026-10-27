import { z } from "zod";
import {
  currency,
  civilDate,
  positiveMoney,
  money,
  version,
} from "../../platform/http/schemas.js";
export const debtInput = z
  .object({
    direction: z.enum(["I_OWE", "OWED_TO_ME"]),
    label: z.string().trim().min(1).max(100),
    originalAmount: positiveMoney,
    remainingAmount: money,
    currency,
    openedOn: civilDate,
    dueOn: civilDate.nullable().optional(),
    recoverability: z
      .enum(["RECOVERABLE", "UNCERTAIN", "DISPUTED"])
      .default("UNCERTAIN"),
  })
  .strict();
export const debtPatch = debtInput
  .partial()
  .extend({
    version,
    recoverability: z.enum(["RECOVERABLE", "UNCERTAIN", "DISPUTED"]).optional(),
  })
  .strict();
export const debtView = debtInput
  .extend({
    id: z.uuid(),
    status: z.enum(["OPEN", "SETTLED"]),
    settledAt: z.string().nullable(),
    version,
    createdAt: z.string(),
    updatedAt: z.string(),
    dueOn: civilDate.nullable(),
  })
  .strip();
export const debtEventView = z.object({
  id: z.string(),
  eventType: z.string(),
  previousRemaining: z.string(),
  nextRemaining: z.string(),
  occurredAt: z.string(),
});
