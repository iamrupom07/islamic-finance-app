import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import {
  QuranScreen,
  QuranReaderScreen,
} from "../src/features/quran/QuranScreens";
import mockBundle from "../src/content/bundle.json";
const mockPush = jest.fn(),
  mockMutation = jest.fn(),
  mockPut = jest.fn(async (...args: unknown[]) => {
    void args;
    return { data: {} };
  });
let mockParams = { surah: "2", ayah: "255" };
const mockProgress = {
  surah: 2,
  ayah: 255,
  version: 1,
  edition: mockBundle.edition,
  updatedAt: "2026-10-27T12:34:00Z",
};
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockPush,
    canGoBack: () => true,
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockParams,
  useSegments: () => [],
}));
jest.mock("../src/content/ContentProvider", () => ({
  useContent: () => ({
    bundle: mockBundle,
    compatible: true,
    loading: false,
    error: null,
  }),
}));
jest.mock("../src/core/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "owner" } }),
}));
jest.mock("../src/core/api/client", () => ({
  api: { PUT: (...args: unknown[]) => mockPut(...args), GET: jest.fn() },
  dataOf: (r: { data: unknown }) => r.data,
}));
jest.mock("../src/core/api/hooks", () => ({
  useAccountQuery: (key: string[]) => ({
    data: key[0] === "quran-progress" ? mockProgress : [],
    isPending: false,
    error: null,
  }),
  useAccountMutation: (work: (v: unknown) => Promise<unknown>) => ({
    isPending: false,
    error: null,
    mutate: (v: unknown) => {
      mockMutation(v);
      void work(v);
    },
  }),
}));
jest.mock("../src/core/audio/PlayerProvider", () => ({
  usePlayer: () => null,
  AudioControls: () => null,
}));
jest.mock("../src/core/storage/encrypted-cache", () => ({
  readSnapshot: jest.fn(async () => null),
  saveSnapshot: jest.fn(async () => {}),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { surah: "2", ayah: "255" };
});
it("continues from the actual saved verse instead of a sample position", async () => {
  const screen = await render(<QuranScreen />);
  await fireEvent.press(screen.getByText("Resume reading"));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/quran/[surah]",
    params: { surah: "2", ayah: "255" },
  });
  expect(screen.queryByText("Last read: 26 Oct 2026, 08:15 AM")).toBeNull();
});
it("opens the target verse page and saves that exact edition-aware position", async () => {
  const screen = await render(<QuranReaderScreen />);
  expect(screen.getByText("2:255")).toBeTruthy();
  const buttons = screen.getAllByText("Mark read here");
  await fireEvent.press(buttons[14]!);
  await waitFor(() =>
    expect(mockPut).toHaveBeenCalledWith("/v1/quran/progress", {
      body: { surah: 2, ayah: 255, version: 1, edition: mockBundle.edition },
    }),
  );
});
it("jumps to the final ayah and rejects out-of-range input without changing position", async () => {
  const screen = await render(<QuranReaderScreen />);
  await fireEvent.changeText(screen.getByLabelText("Jump to ayah"), "286");
  await fireEvent.press(screen.getByText("Go to ayah"));
  expect(screen.getByText("2:286")).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("Jump to ayah"), "287");
  await fireEvent.press(screen.getByText("Go to ayah"));
  expect(screen.getByText("Choose a verse within this surah.")).toBeTruthy();
  expect(screen.getByText("2:286")).toBeTruthy();
});

jest.mock(
  "lucide-react-native",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

it("search normalization finds unvocalized Arabic without changing the source text", () => {
  const { searchText } = require("../src/content/search");
  const original = mockBundle.payload.surahs[0]!.verses[1]!.arabic;
  expect(searchText(original)).toContain(searchText("الحمد"));
  expect(original).toBe(mockBundle.payload.surahs[0]!.verses[1]!.arabic);
});
