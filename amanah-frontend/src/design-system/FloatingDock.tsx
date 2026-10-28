import React from "react";
import { usePlayerLayout } from "../core/audio/layout";
import { View, Pressable } from "react-native";
import { Home, BarChart2, BookOpen, UserRound } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Copy } from "./components";
import { useTheme } from "./ThemeProvider";

function TabDuaIcon({
  size = 20,
  color = "#586669",
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M7 11V5a2 2 0 0 1 4 0v6" />
      <Path d="M17 11V5a2 2 0 0 0-4 0v6" />
      <Path d="M7 11c0 4 2 7 5 7s5-3 5-7" />
      <Path d="M8 15l-3 4" />
      <Path d="M16 15l3 4" />
    </Svg>
  );
}

const items = [
  { name: "home", label: "Home", Icon: Home },
  { name: "finance", label: "Finance", Icon: BarChart2 },
  { name: "quran", label: "Quran", Icon: BookOpen },
  { name: "dua", label: "Dua", Icon: TabDuaIcon },
  { name: "profile", label: "Profile", Icon: UserRound },
];

export function FloatingDock({
  state,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const { colors, dark: isDark, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { setDockHeight } = usePlayerLayout();
  return (
    <View
      style={{
        position: "absolute",
        bottom: Math.max(insets.bottom, 12),
        left: 14,
        right: 14,
        alignItems: "center",
      }}
      pointerEvents="box-none"
    >
      <View
        onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
        style={{
          width: "100%",
          maxWidth: 500,
          padding: 6,
          borderRadius: 999,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 4,
          shadowColor: isDark ? "#000000" : "#0D4233",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.25 : 0.08,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        {items.map((item) => {
          const route = state.routes.find((r) => r.name === item.name);
          const selected = state.routes[state.index]?.name === item.name;
          const activeBg = isDark ? colors.brandFill : "#0F6E56";
          const activeColor = isDark ? colors.brand : "#FFFFFF";
          const inactiveColor = colors.muted;

          return (
            <Pressable
              key={item.name}
              accessibilityRole="tab"
              accessibilityLabel={t(item.label)}
              accessibilityState={{ selected }}
              onPress={() => {
                if (!route) return;
                const event = emitter.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) navigateToTab(route.key);
              }}
              style={{
                minHeight: 46,
                minWidth: 44,
                flexDirection: selected ? "row" : "column",
                gap: selected ? 6 : 2,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: selected ? 16 : 8,
                paddingVertical: selected ? 8 : 4,
                borderRadius: 999,
                backgroundColor: selected ? activeBg : "transparent",
                flex: selected ? 1.4 : 1,
              }}
            >
              <item.Icon
                size={selected ? 19 : 18}
                strokeWidth={1.8}
                color={selected ? activeColor : inactiveColor}
              />
              {selected ? (
                <Copy
                  size={13}
                  medium
                  style={{
                    color: activeColor,
                    flexShrink: 1,
                    fontWeight: "600",
                  }}
                >
                  {item.label}
                </Copy>
              ) : (
                <Copy
                  size={10.5}
                  style={{ color: inactiveColor, marginTop: 1 }}
                >
                  {item.label}
                </Copy>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
