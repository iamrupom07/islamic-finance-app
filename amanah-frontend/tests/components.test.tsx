import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import {
  Button,
  PasswordField,
  ErrorRetry,
  Choice,
} from "../src/design-system/components";
import { ApiError } from "../src/core/api/errors";
jest.mock("lucide-react-native", () => ({
  ArrowLeft: () => null,
  ChevronRight: () => null,
  X: () => null,
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true }),
}));
jest.mock("../src/core/auth/AuthProvider", () => ({
  useAuth: () => ({
    account: { preferences: { locale: "en", appearance: "light" } },
  }),
}));
it("disables repeat submit while a save is pending", async () => {
  const press = jest.fn();
  const screen = await render(<Button label="Save" busy onPress={press} />);
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(press).not.toHaveBeenCalled();
});
it("has a working accessible password visibility control", async () => {
  const screen = await render(<PasswordField value="private-password" />);
  expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Show password" }));
  expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(false);
});
it("retries the same failed action on user request", async () => {
  const retry = jest.fn();
  const screen = await render(
    <ErrorRetry
      error={new ApiError("RATE_LIMITED", "Please try again shortly.", 429)}
      retry={retry}
    />,
  );
  expect(screen.getByText("Please try again shortly.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(retry).toHaveBeenCalledTimes(1);
});
it("selects a value and closes its accessible choice sheet", async () => {
  const change = jest.fn();
  const screen = await render(
    <Choice
      label="Currency"
      options={[
        { label: "BDT", value: "BDT" },
        { label: "USD", value: "USD" },
      ]}
      value="BDT"
      onChange={change}
    />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "BDT" }));
  await fireEvent.press(screen.getByRole("radio", { name: "USD" }));
  expect(change).toHaveBeenCalledWith("USD");
});
