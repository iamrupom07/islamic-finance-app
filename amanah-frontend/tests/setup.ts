jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "secure",
}));

jest.mock("expo-audio", () => {
  const player = {
    pause: jest.fn(),
    play: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(async () => {}),
    setActiveForLockScreen: jest.fn(),
    loop: false,
  };
  return {
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => ({
      currentTime: 0,
      duration: 0,
      isLoaded: false,
      playing: false,
      error: null,
    }),
    setAudioModeAsync: jest.fn(async () => {}),
  };
});
jest.mock("expo-local-authentication", () => ({
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

jest.mock(
  "lucide-react-native",
  () => new Proxy({}, { get: () => () => null }),
);
