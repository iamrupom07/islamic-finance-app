import { z } from "zod";
import { DateTime } from "luxon";
export const money = z.string().regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/);
export const positiveMoney = money.refine(
  (v) => /[1-9]/.test(v),
  "Enter a positive amount.",
);
export const decimal = z.string().regex(/^\d+(?:\.\d+)?$/);
export const currency = z.enum([
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "INR",
  "MYR",
  "CAD",
  "AUD",
]);
export const civilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => DateTime.fromISO(s).isValid, "Use a valid calendar date.");
export const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const idParams = z.object({ id: z.uuid() });
export const version = z.number().int().positive();
export const paging = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(1000).optional(),
});
export const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
  meta: z.object({ requestId: z.string() }),
});
export const envelope = <T extends z.ZodType>(schema: T) =>
  z.object({ data: schema, meta: z.object({ requestId: z.string() }) });
export const page = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  });
export const ok = z.object({ ok: z.literal(true) });
export const idempotencyHeaders = z
  .object({ "idempotency-key": z.string().min(16).max(80) })
  .loose();
