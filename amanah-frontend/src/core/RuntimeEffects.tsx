import React, { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { focusManager } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { queryClient, setConnected } from "./api/client";
import { useAuth } from "./auth/AuthProvider";
import { useTheme } from "../design-system/ThemeProvider";
import { reconcileReminders } from "./notifications/scheduler";
import { clearExportFiles } from "./storage/export-file";
import { safeDestination } from "./navigation/destinations";
export function RuntimeEffects() {
  const auth = useAuth();
  const { dark } = useTheme();
  const router = useRouter();
  const [resume, setResume] = useState(0);
  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        const online =
          s.isConnected !== false && s.isInternetReachable !== false;
        setConnected(online);
        if (online) void queryClient.invalidateQueries();
      }),
    [],
  );
  useEffect(() => {
    void clearExportFiles().catch(() => {});
    const sub = AppState.addEventListener("change", (s) => {
      focusManager.setFocused(s === "active");
      if (s === "active") {
        setResume((n) => n + 1);
        void clearExportFiles().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);
  const pref = auth.account?.preferences;
  useEffect(() => {
    if (auth.status === "authenticated" && auth.user && pref)
      void reconcileReminders(auth.user.id, pref).catch(() => {
        /* OS settings can reject scheduling. Prayer/settings screens expose permission status. */
      });
  }, [auth.status, auth.user?.id, pref, resume]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const visit = (r: Notifications.NotificationResponse) => {
      const path = safeDestination(r.notification.request.content.data?.url);
      if (path) router.push(path as any);
    };
    const sub = Notifications.addNotificationResponseReceivedListener(visit);
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      visit(last);
      Notifications.clearLastNotificationResponse();
    }
    return () => sub.remove();
  }, [router]);
  return <StatusBar style={dark ? "light" : "dark"} />;
}
