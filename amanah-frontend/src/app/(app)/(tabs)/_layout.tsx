import React from "react";
import { Tabs } from "expo-router";
import { FloatingDock } from "../../../design-system/FloatingDock";
export default function MainTabs() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: "none" }}
      tabBar={(props) => <FloatingDock {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="finance" options={{ title: "Finance" }} />
      <Tabs.Screen name="quran" options={{ title: "Quran" }} />
      <Tabs.Screen name="dua" options={{ title: "Dua" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
