import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "./errors.js";
const cursorSchema = z.object({
  userId: z.uuid(),
  scope: z.string(),
  date: z.iso.datetime(),
  id: z.uuid(),
});
export function encodeCursor(
  secret: string,
  userId: string,
  scope: string,
  date: Date,
  id: string,
) {
  const payload = Buffer.from(
    JSON.stringify({ userId, scope, date: date.toISOString(), id }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function decodeCursor(
  secret: string,
  raw: string | undefined,
  userId: string,
  scope: string,
) {
  if (!raw) return null;
  try {
    const [payload = "", signature = ""] = raw.split(".");
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw Error();
    const v = cursorSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString()),
    );
    if (v.userId !== userId || v.scope !== scope) throw Error();
    return { date: new Date(v.date), id: v.id };
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid pagination cursor.");
  }
}
