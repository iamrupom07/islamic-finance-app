import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../core/auth/AuthProvider";
import {
  Screen,
  Loading,
  ErrorRetry,
  Button,
} from "../design-system/components";
import {
  consumeDestination,
  setupDestination,
} from "../core/navigation/destinations";
export default function Start() {
  const a = useAuth();
  if (a.status === "loading") return <Loading />;
  if (a.status === "unavailable")
    return (
      <Screen>
        <ErrorRetry
          error={new Error(a.error ?? "Unavailable")}
          retry={() => {
            void a.reload().catch(() => {});
          }}
        />
        <Button
          secondary
          label="Sign out on this device only"
          onPress={() => {
            void a.clear();
          }}
        />
      </Screen>
    );
  return (
    <Redirect
      href={
        (a.status === "anonymous"
          ? "/welcome"
          : a.account?.preferences.setupCompletedAt
            ? (consumeDestination() ?? "/home")
            : setupDestination(a.account?.preferences.setupStep ?? 0)) as any
      }
    />
  );
}
