import { z } from "zod";
import { month, currency } from "../../platform/http/schemas.js";
export const reportQuery = z.object({ month: month.optional() });
export const reportView = z.object({
  month,
  currency,
  status: z.enum(["AVAILABLE", "CONVERSION_UNAVAILABLE"]),
  income: z.string().nullable(),
  expenses: z.string().nullable(),
  sadaqah: z.string().nullable(),
  categories: z.array(z.object({ category: z.string(), amount: z.string() })),
  hasActivity: z.boolean(),
  displayConversionEstimated: z.boolean(),
  sourceAt: z.string().nullable(),
  reasons: z.array(z.string()),
});
