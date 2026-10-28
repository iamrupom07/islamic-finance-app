import React from "react";
import { PlayerProvider, MiniPlayer } from "../core/audio/PlayerProvider";
import { PlayerLayoutProvider } from "../core/audio/layout";
import { PrivacyProvider } from "../core/privacy/PrivacyProvider";
import { ErrorBoundary as AppErrorBoundary } from "../core/ErrorBoundary";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { ContentProvider } from "../content/ContentProvider";
import { RuntimeEffects } from "../core/RuntimeEffects";
import { queryClient } from "../core/api/client";
import { AuthProvider } from "../core/auth/AuthProvider";
import { ThemeProvider } from "../design-system/ThemeProvider";
import { ToastProvider, Loading } from "../design-system/components";
export default function Root() {
  const [loaded, error] = useFonts({
    Outfit: require("../../assets/fonts/Outfit-Regular.ttf"),
    OutfitMedium: require("../../assets/fonts/Outfit-Medium.ttf"),
    OutfitBold: require("../../assets/fonts/Outfit-Medium.ttf"),
    Arabic: require("../../assets/fonts/Amiri-Regular.ttf"),
    Bengali: require("../../assets/fonts/NotoSansBengali-Regular.ttf"),
  });
  if (!loaded && !error) return <Loading />;
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <ToastProvider>
                <PrivacyProvider>
                  <PlayerLayoutProvider>
                    <ContentProvider>
                      <PlayerProvider>
                        <RuntimeEffects />
                        <Stack screenOptions={{ headerShown: false }} />
                        <MiniPlayer />
                      </PlayerProvider>
                    </ContentProvider>
                  </PlayerLayoutProvider>
                </PrivacyProvider>
              </ToastProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
