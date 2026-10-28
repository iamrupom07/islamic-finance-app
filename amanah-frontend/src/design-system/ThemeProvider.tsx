import React, { createContext, useContext, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useColorScheme } from "react-native";
import { useAuth } from "../core/auth/AuthProvider";
import { light, dark } from "./tokens";
import { translate } from "../core/i18n/messages";
const Theme = createContext({
  colors: light,
  dark: false,
  locale: "en",
  t: (s: string) => s,
});
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const system = useColorScheme();
  const mode = account?.preferences.appearance ?? "system";
  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  const locale = account?.preferences.locale ?? "en";
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync((isDark ? dark : light).canvas).catch(
      () => {},
    );
  }, [isDark]);
  return (
    <Theme.Provider
      value={{
        colors: isDark ? dark : light,
        dark: isDark,
        locale,
        t: (s) => translate(s, locale),
      }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </Theme.Provider>
  );
}
export const useTheme = () => useContext(Theme);
