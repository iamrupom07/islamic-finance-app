import { z } from "zod";
import { version } from "../../platform/http/schemas.js";
export const verseRef = z
  .object({
    surah: z.coerce.number().int().min(1).max(114),
    ayah: z.coerce.number().int().positive().max(286),
  })
  .strict();
export const readingInput = verseRef.extend({
  version,
  edition: z.string().max(100).optional(),
});
export const readingView = readingInput.extend({
  updatedAt: z.string(),
  edition: z.string().nullable(),
});
export const bookmarkView = verseRef.extend({ createdAt: z.string() });
