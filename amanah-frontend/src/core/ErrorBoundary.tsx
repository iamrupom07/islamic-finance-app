import React from "react";
import { View, Text, Pressable } from "react-native";
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          gap: 20,
          backgroundColor: "#F2F5F7",
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 24, color: "#182322" }}
        >
          Amanah could not display this screen.
        </Text>
        <Text style={{ fontSize: 16, color: "#586669" }}>
          Your saved server records are unchanged. Retry to reopen the app.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ failed: false })}
          style={{
            minHeight: 48,
            padding: 14,
            backgroundColor: "#0F6E56",
            borderRadius: 24,
          }}
        >
          <Text style={{ fontSize: 16, color: "#FFFFFF", textAlign: "center" }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }
}
