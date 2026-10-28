import React from "react";
import { Text, AppState } from "react-native";
import { render, act } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import {
  PrivacyProvider,
  usePrivacy,
} from "../src/core/privacy/PrivacyProvider";
import { PrivateModal } from "../src/core/privacy/PrivateModal";
import { purgeDeviceState } from "../src/core/privacy/device-events";
jest.mock("../src/core/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "owner" } }),
}));
let context: ReturnType<typeof usePrivacy>;
let mockBackground: (s: "background") => void = () => {};
function Probe() {
  context = usePrivacy();
  return (
    <PrivateModal visible>
      <Text>Private modal content</Text>
    </PrivateModal>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, listener) => {
      mockBackground = listener;
      return { remove: jest.fn() };
    });
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
    JSON.stringify({ uid: "owner", hidden: true, enabled: true }),
  );
  (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
    success: true,
  });
});
it("hides private modals until device authentication succeeds and relocks on background", async () => {
  const screen = await render(
    <PrivacyProvider>
      <Probe />
    </PrivacyProvider>,
  );
  expect(context.locked).toBe(true);
  expect(screen.queryByText("Private modal content")).toBeNull();
  await act(async () => {
    await context.unlock();
  });
  expect(context.locked).toBe(false);
  expect(screen.getByText("Private modal content")).toBeTruthy();
  await act(async () => {
    mockBackground("background");
  });
  expect(context.locked).toBe(true);
});
it("fails closed if device settings cannot be read or authentication is cancelled", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
    Error("storage unavailable"),
  );
  (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
    success: false,
    error: "user_cancel",
  });
  await render(
    <PrivacyProvider>
      <Probe />
    </PrivacyProvider>,
  );
  expect(context.locked).toBe(true);
  expect(context.enabled).toBe(true);
  await act(async () => {
    await context.unlock();
  });
  expect(context.locked).toBe(true);
});
it("purges hidden-balance and app-lock settings with the account", async () => {
  await render(
    <PrivacyProvider>
      <Probe />
    </PrivacyProvider>,
  );
  expect(context.hidden).toBe(true);
  await act(async () => {
    await purgeDeviceState();
  });
  expect(context.hidden).toBe(false);
  expect(context.enabled).toBe(false);
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
    "amanah.device-privacy.v2",
  );
});

afterEach(() => jest.restoreAllMocks());
