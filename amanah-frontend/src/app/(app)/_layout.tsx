import React, { useEffect } from "react";
import { Stack, Redirect, usePathname } from "expo-router";
import { useAuth } from "../../core/auth/AuthProvider";
import { Screen, Loading, ErrorRetry } from "../../design-system/components";
import { rememberDestination } from "../../core/navigation/destinations";
const setup = new Set([
  "/permissions",
  "/city",
  "/currency",
  "/nisab",
  "/prayer-preferences",
]);
export default function Guard() {
  const a = useAuth();
  const path = usePathname();
  useEffect(() => {
    if (a.status === "anonymous" && !setup.has(path)) rememberDestination(path);
  }, [a.status, path]);
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
      </Screen>
    );
  if (a.status !== "authenticated") return <Redirect href="/login" />;
  if (!a.account?.preferences.setupCompletedAt && !setup.has(path))
    return <Redirect href="/permissions" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
