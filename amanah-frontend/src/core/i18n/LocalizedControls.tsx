import React from "react";
import {
  Pressable,
  TextInput,
  type PressableProps,
  type TextInputProps,
} from "react-native";
import { useTheme } from "../../design-system/ThemeProvider";
export function LocalizedPressable(props: PressableProps) {
  const { t } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityLabel={
        props.accessibilityLabel ? t(props.accessibilityLabel) : undefined
      }
      accessibilityHint={
        props.accessibilityHint ? t(props.accessibilityHint) : undefined
      }
    />
  );
}
export function LocalizedInput(props: TextInputProps) {
  const { t, locale, dark } = useTheme();
  return (
    <TextInput
      keyboardAppearance={dark ? "dark" : "light"}
      {...props}
      accessibilityLabel={
        props.accessibilityLabel ? t(props.accessibilityLabel) : undefined
      }
      placeholder={props.placeholder ? t(props.placeholder) : undefined}
      style={[props.style, locale === "bn" ? { fontFamily: "Bengali" } : null]}
    />
  );
}
