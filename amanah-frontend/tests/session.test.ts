import {
  SessionManager,
  type CredentialStore,
  type SecureSession,
} from "../src/core/auth/session-manager";
import { ApiError } from "../src/core/api/errors";
function fixture() {
  let data: SecureSession | null = { refreshToken: "old", userId: "a" };
  const store: CredentialStore = {
    read: async () => data,
    write: async (v) => {
      data = v;
    },
    clear: async () => {
      data = null;
    },
  };
  return { store, read: () => data };
}
const token = (id = "a") => ({
  accessToken: "access-" + id,
  refreshToken: "refresh-" + id,
  user: { id, email: id + "@example.test" },
});
it("serializes simultaneous refresh calls into one exchange", async () => {
  const f = fixture();
  const exchange = jest.fn(async () => token());
  const m = new SessionManager(f.store, exchange, async () => {});
  const values = await Promise.all([m.refresh(), m.refresh(), m.refresh()]);
  expect(exchange).toHaveBeenCalledTimes(1);
  expect(values.map((v) => v.refreshToken)).toEqual([
    "refresh-a",
    "refresh-a",
    "refresh-a",
  ]);
  expect(f.read()?.refreshToken).toBe("refresh-a");
});
it("purges credentials on refresh rejection", async () => {
  const f = fixture();
  const clear = jest.fn(async () => {});
  const m = new SessionManager(
    f.store,
    async () => {
      throw new ApiError("AUTH_REQUIRED", "Expired", 401);
    },
    clear,
  );
  await expect(m.refresh()).rejects.toThrow("Expired");
  expect(f.read()).toBeNull();
  expect(clear).toHaveBeenCalledTimes(1);
});
it("retains credentials during a transient network failure", async () => {
  const f = fixture();
  const m = new SessionManager(
    f.store,
    async () => {
      throw new ApiError("TIMEOUT", "Temporary");
    },
    async () => {},
  );
  await expect(m.refresh()).rejects.toThrow();
  expect(f.read()?.refreshToken).toBe("old");
});
it("does not restore a session after logout while refresh was pending", async () => {
  const f = fixture();
  let release!: (v: ReturnType<typeof token>) => void;
  const m = new SessionManager(
    f.store,
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    async () => {},
  );
  const pending = m.refresh();
  await Promise.resolve();
  await Promise.resolve();
  await m.clear();
  release(token());
  await expect(pending).rejects.toThrow("Session changed");
  expect(m.user).toBeNull();
  expect(f.read()).toBeNull();
});
it("cannot let an old refresh replace a newly signed-in account", async () => {
  const f = fixture();
  let release!: (v: ReturnType<typeof token>) => void;
  const m = new SessionManager(
    f.store,
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    async () => {},
  );
  const pending = m.refresh();
  await Promise.resolve();
  await Promise.resolve();
  await m.accept(token("b"));
  release(token("a"));
  await expect(pending).rejects.toThrow("Session changed");
  expect(m.user?.id).toBe("b");
  expect(f.read()?.userId).toBe("b");
});
