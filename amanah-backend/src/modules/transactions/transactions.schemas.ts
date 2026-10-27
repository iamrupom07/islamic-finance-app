import { z } from "zod";
import {
  positiveMoney,
  currency,
  civilDate,
  version,
  paging,
  month,
  money,
} from "../../platform/http/schemas.js";
export const transactionInput = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    category: z.enum([
      "SALARY",
      "BUSINESS",
      "GIFT",
      "INVESTMENT_RETURN",
      "FOOD",
      "BILLS",
      "TRANSPORT",
      "SADAQAH",
      "DEBT_REPAYMENT",
      "OTHER",
    ]),
    amount: positiveMoney,
    currency,
    localDate: civilDate,
    description: z.string().max(500).nullable().optional(),
    isSadaqah: z.boolean().default(false),
    enteredRate: z
      .string()
      .regex(/^\d{1,12}(?:\.\d{1,12})?$/)
      .optional(),
    enteredRateAt: z.iso.datetime().optional(),
    acceptCurrentRate: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) => !v.isSadaqah || v.type === "EXPENSE",
    "Sadaqah must be an expense.",
  )
  .refine(
    (v) =>
      v.type === "INCOME"
        ? ["SALARY", "BUSINESS", "GIFT", "INVESTMENT_RETURN", "OTHER"].includes(
            v.category,
          )
        : [
            "FOOD",
            "BILLS",
            "TRANSPORT",
            "SADAQAH",
            "DEBT_REPAYMENT",
            "OTHER",
          ].includes(v.category),
    "Choose a category appropriate to the transaction direction.",
  )
  .refine(
    (v) => v.category !== "SADAQAH" || v.isSadaqah,
    "The Sadaqah category must be included in Sadaqah totals.",
  )
  .refine(
    (v) => (v.enteredRate === undefined) === (v.enteredRateAt === undefined),
    "Enter both rate and timestamp.",
  );
export const transactionPatch = z
  .object(transactionInput.shape)
  .partial()
  .extend({ version, isSadaqah: z.boolean().optional() })
  .strict();
export const transactionView = z.object({
  id: z.uuid(),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string(),
  amount: money,
  currency,
  localDate: civilDate,
  description: z.string().nullable(),
  isSadaqah: z.boolean(),
  reportingCurrency: currency,
  reportingRate: z.string(),
  reportingAmount: z.string(),
  rateSource: z.string(),
  rateAt: z.string(),
  rateEstimated: z.boolean(),
  version,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const transactionQuery = paging.extend({
  month: month.optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  isSadaqah: z.coerce
    .string()
    .pipe(z.enum(["true", "false"]))
    .optional(),
});
