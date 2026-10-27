import { z } from "zod";
export const duaParams = z
  .object({
    duaId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/),
  })
  .strict();
export const favoriteView = z.object({
  duaId: z.string(),
  createdAt: z.string(),
});
