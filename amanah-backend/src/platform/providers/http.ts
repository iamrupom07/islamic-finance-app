import { parse as parseLossless } from "lossless-json";
import { unavailable } from "../http/errors.js";
export class ProviderHttp {
  private failures = 0;
  private openUntil = 0;
  constructor(
    private timeout = 4000,
    private fetcher: typeof fetch = fetch,
  ) {}
  async json(
    url: string,
    init: RequestInit = {},
    safeRead = true,
    decimalNumbers = false,
  ): Promise<unknown> {
    if (Date.now() < this.openUntil) throw unavailable();
    for (let attempt = 0; attempt < (safeRead ? 2 : 1); attempt++) {
      let retryAllowed = safeRead;
      try {
        const r = await this.fetcher(url, {
          ...init,
          signal: AbortSignal.timeout(this.timeout),
          redirect: "error",
        });
        if (!r.ok) {
          if (r.status >= 400 && r.status < 500) retryAllowed = false;
          if (r.status === 429)
            throw unavailable("The data source is temporarily busy.");
          throw unavailable();
        }
        const text = await r.text();
        if (text.length > 2000000) throw unavailable();
        const data: unknown = decimalNumbers
          ? parseLossless(text, undefined, (value) => value)
          : JSON.parse(text);
        this.failures = 0;
        return data;
      } catch {
        this.failures++;
        if (this.failures >= 4) this.openUntil = Date.now() + 30000;
        if (!retryAllowed || attempt === (safeRead ? 1 : 0))
          throw unavailable();
        await new Promise((resolve) =>
          setTimeout(resolve, 100 + Math.random() * 100),
        );
      }
    }
    throw unavailable();
  }
}
