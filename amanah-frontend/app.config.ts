import { existsSync } from "node:fs";
import type { ExpoConfig, ConfigContext } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => {
  const production = process.env.EAS_BUILD_PROFILE === "production";
  const androidId = process.env.AMANAH_ANDROID_PACKAGE ?? "dev.amanah.local";
  const iosId = process.env.AMANAH_IOS_BUNDLE_ID ?? "dev.amanah.local";
  if (
    production &&
    (!process.env.AMANAH_ANDROID_PACKAGE ||
      !process.env.AMANAH_IOS_BUNDLE_ID ||
      !process.env.EXPO_PUBLIC_API_BASE_URL?.startsWith("https://"))
  )
    throw new Error("Production needs real app IDs and HTTPS API origin.");
  return {
    ...config,
    ...(existsSync("assets/brand/official-icon.png")
      ? { icon: "./assets/brand/official-icon.png" }
      : {}),
    name: "Amanah",
    slug: "amanah",
    version: "0.1.0",
    scheme: "amanah",
    orientation: "default",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: iosId,
      supportsTablet: true,
      usesAppleSignIn: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Choose a nearby city for prayer times. You can choose a city manually instead.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: { package: androidId, permissions: ["POST_NOTIFICATIONS"] },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      ["expo-sqlite", { useSQLCipher: true }],
      "expo-apple-authentication",
      ["expo-notifications", { defaultChannel: "prayer" }],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Use your approximate location to suggest a prayer city.",
        },
      ],
      ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
        ? [
            [
              "@react-native-google-signin/google-signin",
              { iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME },
            ] as [string, Record<string, string>],
          ]
        : []),
    ],
    extra: { eas: { projectId: process.env.EAS_PROJECT_ID } },
    experiments: { typedRoutes: false },
  };
};
