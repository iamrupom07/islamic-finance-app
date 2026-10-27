import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { Env } from "../../config/env.js";
import { ProviderHttp } from "./http.js";
import { unavailable } from "../http/errors.js";
export interface MailPort {
  send(email: string, kind: "VERIFY" | "RESET", token: string): Promise<void>;
}
export function mailProvider(env: Env): MailPort {
  const http = new ProviderHttp(env.PROVIDER_TIMEOUT_MS);
  return {
    async send(email, kind, token) {
      if (
        env.MAIL_PROVIDER === "development" &&
        env.NODE_ENV !== "production"
      ) {
        await mkdir(env.DEV_MAIL_OUTBOX_DIR, { recursive: true, mode: 0o700 });
        await writeFile(
          join(env.DEV_MAIL_OUTBOX_DIR, randomUUID() + ".json"),
          JSON.stringify({ email, kind, token }),
          { mode: 0o600, flag: "wx" },
        );
        return;
      }
      if (env.MAIL_PROVIDER !== "resend")
        throw unavailable("Email delivery is not configured.");
      const path = kind === "VERIFY" ? "verify-email" : "complete-reset";
      const link = `${env.APP_LINK_ORIGIN.replace(/\/$/, "")}/${path}?token=${encodeURIComponent(token)}`;
      await http.json(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.MAIL_PROVIDER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: env.MAIL_SENDER_ADDRESS,
            to: [email],
            subject:
              kind === "VERIFY"
                ? "Verify your Amanah email"
                : "Reset your Amanah password",
            text: `Open this link in Amanah: ${link}\nIf you did not request this, ignore this message.`,
          }),
        },
        false,
      );
    },
  };
}
