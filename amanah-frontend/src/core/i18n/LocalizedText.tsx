import React from "react";
import { Text, type TextProps } from "react-native";
import { useTheme } from "../../design-system/ThemeProvider";
export function LocalizedText({ children, ...props }: TextProps) {
  const { t, locale } = useTheme();
  const localize = (value: React.ReactNode): React.ReactNode =>
    typeof value === "string"
      ? t(value)
      : Array.isArray(value)
        ? value.map(localize)
        : value;
  return (
    <Text
      {...props}
      accessibilityLabel={
        props.accessibilityLabel ? t(props.accessibilityLabel) : undefined
      }
      style={[props.style, locale === "bn" ? { fontFamily: "Bengali" } : null]}
    >
      {localize(children)}
    </Text>
  );
}
