import { z } from "zod";
export const credentials = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.trim().toLowerCase()),
    password: z.string().min(12).max(128),
  })
  .strict();
export const loginInput = credentials.extend({
  password: z.string().min(1).max(128),
});
export const tokenInput = z
  .object({ token: z.string().min(32).max(256) })
  .strict();
export const socialInput = z
  .object({
    idToken: z.string().min(50).max(10000),
    nonce: z.string().min(16).max(256).optional(),
  })
  .strict();
export const refreshInput = z
  .object({ refreshToken: z.string().min(32).max(256) })
  .strict();
export const emailInput = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.trim().toLowerCase()),
  })
  .strict();
export const resetInput = tokenInput.extend({
  password: credentials.shape.password,
});
export const reauthInput = z
  .object({
    password: z.string().min(1).max(128).optional(),
    provider: z.enum(["GOOGLE", "APPLE"]).optional(),
    idToken: socialInput.shape.idToken.optional(),
    nonce: socialInput.shape.nonce,
  })
  .strict();
export const publicUser = z.object({
  id: z.uuid(),
  email: z.email(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
});
export const sessionResponse = z.object({
  user: publicUser,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
});
export const message = z.object({ message: z.string() });
