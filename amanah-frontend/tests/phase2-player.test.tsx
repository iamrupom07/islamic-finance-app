import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import { PlayerProvider, usePlayer } from "../src/core/audio/PlayerProvider";
import { purgeDeviceState } from "../src/core/privacy/device-events";
import {
  readSnapshot,
  saveSnapshot,
} from "../src/core/storage/encrypted-cache";
import type { Track } from "../src/content/contract";
const mockPlayer = {
  pause: jest.fn(),
  play: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(async () => {}),
  setActiveForLockScreen: jest.fn(),
  loop: false,
};
const mockStatus = {
  currentTime: 0,
  duration: 0,
  isLoaded: false,
  playing: false,
  error: null,
};
let mockUser = { id: "owner-a" };
jest.mock("expo-audio", () => ({
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => mockStatus,
  setAudioModeAsync: jest.fn(async () => {}),
}));
jest.mock("../src/core/auth/AuthProvider", () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock("../src/content/ContentProvider", () => ({
  useContent: () => ({ bundle: { edition: "installed" } }),
}));
jest.mock("../src/core/audio/downloads", () => ({
  localAudio: jest.fn(async () => null),
}));
jest.mock("../src/core/storage/encrypted-cache", () => ({
  readSnapshot: jest.fn(async () => null),
  saveSnapshot: jest.fn(async () => {}),
}));
jest.mock("expo-router", () => ({ useSegments: () => [] }));
jest.mock(
  "lucide-react-native",
  () => new Proxy({}, { get: () => () => null }),
);
const track: Track = {
  id: "test-surah",
  title: "Test surah",
  artist: "Software fixture",
  url: "https://example.test/001.mp3",
  edition: "installed",
  rights: "https://example.test/rights",
  streamAllowed: true,
  downloadAllowed: true,
  kind: "QURAN",
  surah: 1,
};
let context: NonNullable<ReturnType<typeof usePlayer>>;
function Probe() {
  context = usePlayer()!;
  return null;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: "owner-a" };
  Object.assign(mockStatus, {
    currentTime: 0,
    duration: 0,
    isLoaded: false,
    playing: false,
    error: null,
  });
  (readSnapshot as jest.Mock).mockResolvedValue(null);
});
it("restores the same recording position after loading and configures lock-screen controls", async () => {
  (readSnapshot as jest.Mock).mockResolvedValue({
    data: { track, seconds: 42 },
  });
  const screen = await render(
    <PlayerProvider>
      <Probe />
    </PlayerProvider>,
  );
  await act(async () => {
    await context.open(track);
  });
  expect(mockPlayer.replace).toHaveBeenCalledWith(track.url);
  expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(
    true,
    expect.objectContaining({ title: track.title, artist: track.artist }),
    expect.anything(),
  );
  Object.assign(mockStatus, { isLoaded: true, duration: 100, currentTime: 0 });
  await screen.rerender(
    <PlayerProvider>
      <Probe />
    </PlayerProvider>,
  );
  await waitFor(() => expect(mockPlayer.seekTo).toHaveBeenCalledWith(42));
  expect(mockPlayer.play).toHaveBeenCalled();
  await act(async () => {
    context.setRepeat(true);
  });
  expect(mockPlayer.loop).toBe(true);
});
it("does not start a delayed recording after the account changes", async () => {
  let finish!: (value: null) => void;
  (readSnapshot as jest.Mock).mockImplementation(
    () =>
      new Promise<null>((r) => {
        finish = r;
      }),
  );
  const screen = await render(
    <PlayerProvider>
      <Probe />
    </PlayerProvider>,
  );
  let opening!: Promise<void>;
  await act(async () => {
    opening = context.open(track);
  });
  mockUser = { id: "owner-b" };
  await screen.rerender(
    <PlayerProvider>
      <Probe />
    </PlayerProvider>,
  );
  await act(async () => {
    finish(null);
    await opening;
  });
  expect(mockPlayer.replace).not.toHaveBeenCalledWith(track.url);
  expect(mockPlayer.play).not.toHaveBeenCalled();
  expect(saveSnapshot).not.toHaveBeenCalledWith(
    "owner-b",
    "audio-resume",
    expect.anything(),
  );
});
it("rejects mismatched audio editions and clears native playback on device purge", async () => {
  await render(
    <PlayerProvider>
      <Probe />
    </PlayerProvider>,
  );
  await act(async () => {
    await context.open({ ...track, edition: "different" });
  });
  expect(context.error).toBeTruthy();
  expect(mockPlayer.replace).not.toHaveBeenCalledWith(track.url);
  await act(async () => {
    await context.open(track);
  });
  expect(context.track?.id).toBe(track.id);
  await act(async () => {
    await purgeDeviceState();
  });
  expect(context.track).toBeNull();
  expect(mockPlayer.setActiveForLockScreen).toHaveBeenLastCalledWith(false);
  expect(mockPlayer.replace).toHaveBeenLastCalledWith(null);
});
