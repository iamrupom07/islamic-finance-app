const mockExec = jest.fn(async (_sql: string) => {
  void _sql;
});
const mockRun = jest.fn(async (...args: unknown[]) => {
  void args;
});
const mockClose = jest.fn(async () => {});
const mockFirst = jest.fn();
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => ({
    getFirstAsync: mockFirst,
    execAsync: mockExec,
    runAsync: mockRun,
    closeAsync: mockClose,
  })),
  deleteDatabaseAsync: jest.fn(async () => {}),
}));
jest.mock("expo-crypto", () => ({
  getRandomBytesAsync: jest.fn(async () => new Uint8Array(32)),
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "secure",
}));
beforeEach(() => {
  jest.resetModules();
  mockExec.mockClear();
  mockRun.mockClear();
  mockClose.mockClear();
  mockFirst.mockReset();
});
it("never writes a financial record or schema when SQLCipher is unavailable", async () => {
  mockFirst.mockResolvedValue(null);
  const cache =
    require("../src/core/storage/encrypted-cache") as typeof import("../src/core/storage/encrypted-cache");
  await cache.saveSnapshot("a", "home", { income: "private" });
  expect(mockFirst).toHaveBeenCalledWith("PRAGMA cipher_version");
  expect(mockExec).not.toHaveBeenCalled();
  expect(mockRun).not.toHaveBeenCalled();
  expect(mockClose).toHaveBeenCalled();
});
it("keys the database before creating a snapshot table and scopes writes by account", async () => {
  mockFirst.mockResolvedValue({ cipher_version: "4.6.0" });
  const cache =
    require("../src/core/storage/encrypted-cache") as typeof import("../src/core/storage/encrypted-cache");
  await cache.saveSnapshot("account-a", "home", { income: "123.45" });
  expect(mockExec.mock.calls[0]?.[0]).toContain("PRAGMA key");
  expect(mockRun.mock.calls[0]?.slice(1, 3)).toEqual(["account-a", "home"]);
});
it("prevents pending snapshot writes from surviving logout purge", async () => {
  mockFirst.mockResolvedValue({ cipher_version: "4.6.0" });
  const cache =
    require("../src/core/storage/encrypted-cache") as typeof import("../src/core/storage/encrypted-cache");
  const pending = cache.saveSnapshot("account-a", "home", {
    income: "private",
  });
  await cache.clearSnapshots();
  await pending;
  expect(mockRun).not.toHaveBeenCalled();
});
