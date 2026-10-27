import { ApiError } from "../api/errors";
export interface SecureSession {
  refreshToken: string;
  userId: string;
}
export interface CredentialStore {
  read(): Promise<SecureSession | null>;
  write(value: SecureSession): Promise<void>;
  clear(): Promise<void>;
}
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}
export class SessionManager {
  accessToken: string | null = null;
  user: SessionTokens["user"] | null = null;
  private refreshing: Promise<SessionTokens> | null = null;
  private epoch = 0;
  private writes: Promise<unknown> = Promise.resolve();
  constructor(
    private store: CredentialStore,
    private exchange: (refresh: string) => Promise<SessionTokens>,
    private onClear: () => Promise<void>,
  ) {}
  private serialize<T>(work: () => Promise<T>) {
    const next = this.writes.catch(() => {}).then(work);
    this.writes = next;
    return next;
  }
  async accept(s: SessionTokens) {
    const epoch = ++this.epoch;
    await this.serialize(async () => {
      if (epoch !== this.epoch) return;
      const previous = await this.store.read();
      if (previous && previous.userId !== s.user.id) await this.onClear();
      if (epoch !== this.epoch) return;
      await this.store.write({
        refreshToken: s.refreshToken,
        userId: s.user.id,
      });
      if (epoch === this.epoch) {
        this.accessToken = s.accessToken;
        this.user = s.user;
      }
    });
    if (epoch !== this.epoch)
      throw new ApiError("SESSION_CHANGED", "Session changed.", 401);
  }
  refresh() {
    if (this.refreshing) return this.refreshing;
    const epoch = this.epoch;
    const work = (async () => {
      await this.writes;
      const saved = await this.store.read();
      if (!saved)
        throw new ApiError("AUTH_REQUIRED", "Please sign in again.", 401);
      try {
        const s = await this.exchange(saved.refreshToken);
        if (epoch !== this.epoch)
          throw new ApiError("SESSION_CHANGED", "Session changed.", 401);
        await this.accept(s);
        return s;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401 && epoch === this.epoch)
          await this.clear();
        throw e;
      }
    })();
    this.refreshing = work;
    void work
      .finally(() => {
        if (this.refreshing === work) this.refreshing = null;
      })
      .catch(() => {});
    return work;
  }
  async restore() {
    await this.writes;
    const saved = await this.store.read();
    return saved ? this.refresh() : null;
  }
  async clear() {
    this.epoch++;
    this.accessToken = null;
    this.user = null;
    this.refreshing = null;
    try {
      await this.serialize(() => this.store.clear());
    } finally {
      await this.onClear();
    }
  }
}
