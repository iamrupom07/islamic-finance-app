import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { api, dataOf } from "../../core/api/client";
import { ApiError } from "../../core/api/errors";
export async function socialProof(provider: "GOOGLE" | "APPLE") {
  if (provider === "GOOGLE") {
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)
      throw new ApiError(
        "SIGN_IN_UNAVAILABLE",
        "Google sign-in is not configured.",
      );
    const { GoogleSignin } =
      await import("@react-native-google-signin/google-signin");
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    if (Platform.OS === "android") await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response.type !== "success" || !response.data.idToken)
      throw new ApiError("SIGN_IN_CANCELLED", "Sign-in was cancelled.");
    return { provider, idToken: response.data.idToken };
  }
  if (Platform.OS !== "ios" || !(await AppleAuthentication.isAvailableAsync()))
    throw new ApiError(
      "SIGN_IN_UNAVAILABLE",
      "Apple sign-in is not available on this device.",
    );
  const nonce = dataOf(await api.POST("/v1/auth/apple/nonce")).nonce;
  const result = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce,
  });
  if (!result.identityToken)
    throw new ApiError("SIGN_IN_CANCELLED", "Sign-in was cancelled.");
  return { provider, idToken: result.identityToken, nonce };
}
export async function socialLogin(provider: "GOOGLE" | "APPLE") {
  const proof = await socialProof(provider);
  return dataOf(
    await api.POST(
      provider === "GOOGLE" ? "/v1/auth/google" : "/v1/auth/apple",
      {
        body: {
          idToken: proof.idToken,
          ...("nonce" in proof ? { nonce: proof.nonce } : {}),
        },
      },
    ),
  );
}
