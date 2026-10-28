import {
  downloadAudio,
  localAudio,
  purgeDownloads,
  downloaded,
} from "../src/core/audio/downloads";
import * as FS from "expo-file-system/legacy";
import { saveSnapshot } from "../src/core/storage/encrypted-cache";
import type { Track } from "../src/content/contract";
const mockSnapshots = new Map<string, unknown>();
jest.mock("../src/core/storage/encrypted-cache", () => ({
  snapshotsAvailable: jest.fn(async () => true),
  readSnapshot: jest.fn(async (uid: string, key: string) =>
    mockSnapshots.has(uid + key)
      ? { data: mockSnapshots.get(uid + key) }
      : null,
  ),
  saveSnapshot: jest.fn(async (uid: string, key: string, value: unknown) => {
    mockSnapshots.set(uid + key, value);
    return true;
  }),
}));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "sha256" },
  digestStringAsync: jest.fn(async () => "owner-hash"),
  digest: jest.fn(async () => new Uint8Array([1, 2, 3]).buffer),
}));
jest.mock("expo-file-system", () => ({
  File: class {
    async bytes() {
      return new Uint8Array([4, 5, 6]);
    }
  },
}));
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///private/",
  makeDirectoryAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => ["amanah-audio-owner-hash"]),
  getFreeDiskStorageAsync: jest.fn(async () => 1024 * 1024 * 1024),
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 100 })),
  moveAsync: jest.fn(async () => {}),
  createDownloadResumable: jest.fn(),
}));
const track: Track = {
  id: "test-audio",
  title: "Software fixture",
  artist: "Fixture",
  url: "https://example.test/test.mp3",
  edition: "fixture",
  rights: "https://example.test/rights",
  streamAllowed: true,
  downloadAllowed: true,
  kind: "DUA",
  duaId: "fixture",
};
beforeEach(() => {
  jest.clearAllMocks();
  mockSnapshots.clear();
});
it("refuses a recording without download permission before creating a task", async () => {
  await expect(
    downloadAudio("owner", { ...track, downloadAllowed: false }),
  ).rejects.toThrow("does not permit");
  expect(FS.createDownloadResumable).not.toHaveBeenCalled();
});
it("rejects storage overflow without starting a request", async () => {
  mockSnapshots.set("owneraudio-downloads", [
    {
      track: { ...track, id: "existing" },
      uri: "file:///private/existing.mp3",
      bytes: 250 * 1024 * 1024,
    },
  ]);
  await expect(downloadAudio("owner", track)).rejects.toThrow("limit");
  expect(FS.createDownloadResumable).not.toHaveBeenCalled();
});
it("detects corrupted local bytes and removes their metadata", async () => {
  mockSnapshots.set("owneraudio-downloads", [
    { track, uri: "file:///private/test.mp3", bytes: 100, sha256: "tampered" },
  ]);
  await expect(localAudio("owner", track)).rejects.toThrow("integrity");
  expect(await downloaded("owner")).toEqual([]);
  expect(FS.deleteAsync).toHaveBeenCalledWith("file:///private/test.mp3", {
    idempotent: true,
  });
});
it("records a paused download and reuses only its matching edition", async () => {
  const task = {
    downloadAsync: jest.fn(async () => undefined),
    savable: () => ({ resumeData: "native-resume-token" }),
    pauseAsync: jest.fn(async () => {}),
  };
  (FS.createDownloadResumable as jest.Mock).mockReturnValue(task);
  await downloadAudio("owner", track);
  expect(mockSnapshots.get("owneraudio-pending")).toMatchObject({
    track,
    resumeData: "native-resume-token",
  });
  await expect(
    downloadAudio("owner", { ...track, edition: "different" }, true),
  ).rejects.toThrow("different edition");
});
it("cancels a task across logout without writing resumed metadata after purge", async () => {
  let resolve!: (value: undefined) => void;
  const task = {
    downloadAsync: jest.fn(
      () =>
        new Promise<undefined>((r) => {
          resolve = r;
        }),
    ),
    savable: () => ({ resumeData: "not-to-be-saved" }),
    pauseAsync: jest.fn(async () => {
      resolve(undefined);
    }),
  };
  (FS.createDownloadResumable as jest.Mock).mockReturnValue(task);
  const pending = downloadAudio("owner", track);
  while (!task.downloadAsync.mock.calls.length) await Promise.resolve();
  const before = (saveSnapshot as jest.Mock).mock.calls.length;
  await purgeDownloads();
  await expect(pending).rejects.toThrow("Session changed");
  expect((saveSnapshot as jest.Mock).mock.calls.length).toBe(before);
  expect(FS.deleteAsync).toHaveBeenCalledWith(
    "file:///private/amanah-audio-owner-hash",
    { idempotent: true },
  );
});
