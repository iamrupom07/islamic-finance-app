import { z } from "zod";
import {
  currency,
  civilDate,
  positiveMoney,
  version,
} from "../../platform/http/schemas.js";
export const assetInput = z
  .object({
    type: z.enum([
      "CASH",
      "SAVINGS",
      "GOLD",
      "SILVER",
      "INVESTMENT",
      "BUSINESS_INVENTORY",
    ]),
    label: z.string().trim().min(1).max(100),
    note: z.string().trim().max(500).nullable().optional(),
    currency,
    valuationMode: z.enum(["MANUAL", "METAL_RATE"]),
    weightQuantity: z
      .string()
      .regex(/^\d{1,10}(?:\.\d{1,12})?$/)
      .nullable()
      .optional(),
    weightUnit: z.enum(["g", "bhori", "tola", "ozt"]).nullable().optional(),
    declaredValue: positiveMoney.nullable().optional(),
    weightGrams: z
      .string()
      .regex(/^\d{1,10}(?:\.\d{1,6})?$/)
      .nullable()
      .optional(),
    purity: z
      .string()
      .regex(/^(?:0(?:\.\d{1,6})?|1(?:\.0{1,6})?)$/)
      .nullable()
      .optional(),
    valuedOn: civilDate,
  })
  .strict();
export const assetPatch = assetInput.partial().extend({ version }).strict();
export const assetView = assetInput
  .extend({
    id: z.uuid(),
    declaredValue: z.string().nullable(),
    weightGrams: z.string().nullable(),
    purity: z.string().nullable(),
    version,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
