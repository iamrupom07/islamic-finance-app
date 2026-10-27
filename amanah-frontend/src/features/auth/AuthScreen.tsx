import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Linking,
  Platform,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { ErrorRetry } from "../../design-system/components";
import { api, dataOf } from "../../core/api/client";
import { useAuth } from "../../core/auth/AuthProvider";
import { socialLogin } from "./social";
import {
  AmanahLogoBadge,
  GoogleIcon,
} from "../onboarding/OnboardingIllustrations";

const base = z.object({
  email: z.string().email("Enter a valid email.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
});

export function AuthScreen({
  mode,
}: {
  mode: "login" | "register" | "forgot" | "reset" | "verify";
}) {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const auth = useAuth();
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const schema =
    mode === "forgot"
      ? base.pick({ email: true })
      : mode === "reset"
        ? base.pick({ password: true }).extend({
            password: z
              .string()
              .min(8, "Use at least 8 characters.")
              .max(128),
          })
        : mode === "register"
          ? base.extend({
              password: z
                .string()
                .min(8, "Use at least 8 characters.")
                .max(128),
            })
          : base;

  const form = useForm<{ email?: string; password?: string }>({
    resolver: zodResolver(schema) as any,
    defaultValues: { email: "", password: "" },
  });

  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => dataOf(await api.GET("/v1/catalog")),
    staleTime: 3600000,
    retry: 1,
  });

  const title = {
    login: "Sign in",
    register: "Create your account",
    forgot: "Reset password",
    reset: "New password",
    verify: "Verify email",
  }[mode];

  const subtitle = {
    login: "A clear place for money and zakat.",
    register: "A clear place for money and zakat.",
    forgot: "Enter your email to receive a password reset link.",
    reset: "Choose a new strong password for your account.",
    verify: "Confirm your email to complete registration.",
  }[mode];

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await auth.accept(
          dataOf(
            await api.POST("/v1/auth/login", {
              body: { email: values.email!, password: values.password! },
            }),
          ),
        );
        router.replace("/");
      }
      if (mode === "register") {
        setMessage(
          dataOf(
            await api.POST("/v1/auth/register", {
              body: { email: values.email!, password: values.password! },
            }),
          ).message,
        );
        form.reset({ email: values.email, password: "" });
      }
      if (mode === "forgot") {
        setMessage(
          dataOf(
            await api.POST("/v1/auth/password/forgot", {
              body: { email: values.email! },
            }),
          ).message,
        );
      }
      if (mode === "reset") {
        if (!token) throw Error("Open the reset link from your email.");
        await api.POST("/v1/auth/password/reset", {
          body: { token, password: values.password! },
        });
        setMessage("Password updated. Sign in again.");
        form.reset();
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  });

  const social = async (provider: "GOOGLE" | "APPLE") => {
    setBusy(true);
    setError(null);
    try {
      await auth.accept(await socialLogin(provider));
      router.replace("/");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      if (!token) throw Error("Open the verification link from your email.");
      await api.POST("/v1/auth/verify-email", { body: { token } });
      setMessage("Your email is verified. You can sign in.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/welcome");
    }
  };

  const termsUrl =
    process.env.EXPO_PUBLIC_TERMS_URL || "https://amanah.app/terms";
  const privacyUrl =
    process.env.EXPO_PUBLIC_PRIVACY_URL || "https://amanah.app/privacy";

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with circular back button and centered logo */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={handleBack}
              style={({ pressed }) => [
                styles.circleBackButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ArrowLeft size={20} color="#182322" strokeWidth={2.2} />
            </Pressable>

            <View style={styles.headerLogoCenter}>
              <AmanahLogoBadge size={34} />
              <Text style={styles.headerLogoTitle}>Amanah</Text>
            </View>

            {/* Spacer to keep center alignment perfect */}
            <View style={styles.headerSpacer} />
          </View>

          {/* Title and Subtitle */}
          <View style={styles.titleSection}>
            <Text accessibilityRole="header" style={styles.pageTitle}>
              {title}
            </Text>
            <Text style={styles.pageSubtitle}>{subtitle}</Text>
          </View>

          {/* Notification / Message banner */}
          {message ? (
            <View style={styles.messageBanner}>
              <Text style={styles.messageText}>{message}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                onPress={() => router.replace("/login")}
                style={styles.messageButton}
              >
                <Text style={styles.messageButtonText}>Sign in  →</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBannerWrapper}>
              <ErrorRetry error={error} />
            </View>
          ) : null}

          {/* Form Card */}
          {mode === "verify" ? (
            <View style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Verify email"
                disabled={busy}
                onPress={() => {
                  void verify();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { opacity: busy || pressed ? 0.75 : 1 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify email  →</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              {/* Email Address Field */}
              {mode !== "reset" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email address</Text>
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <View>
                        <View
                          style={[
                            styles.inputContainer,
                            fieldState.error ? styles.inputErrorBorder : null,
                          ]}
                        >
                          <Mail size={19} color="#94A3B8" strokeWidth={1.8} />
                          <TextInput
                            accessibilityLabel="Email"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            placeholder="you@example.com"
                            placeholderTextColor="#94A3B8"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            style={styles.textInput}
                          />
                        </View>
                        {fieldState.error?.message ? (
                          <Text style={styles.errorText}>
                            {fieldState.error.message}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Password Field */}
              {mode !== "forgot" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <Controller
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <View>
                        <View
                          style={[
                            styles.inputContainer,
                            fieldState.error ? styles.inputErrorBorder : null,
                          ]}
                        >
                          <Lock size={19} color="#94A3B8" strokeWidth={1.8} />
                          <TextInput
                            accessibilityLabel="Password"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            placeholder={
                              mode === "register"
                                ? "Create a strong password"
                                : "Enter your password"
                            }
                            placeholderTextColor="#94A3B8"
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete={
                              mode === "login"
                                ? "current-password"
                                : "new-password"
                            }
                            style={styles.textInput}
                          />
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                              showPassword ? "Hide password" : "Show password"
                            }
                            onPress={() => setShowPassword((v) => !v)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.eyeButton}
                          >
                            {showPassword ? (
                              <EyeOff size={19} color="#64748B" strokeWidth={1.8} />
                            ) : (
                              <Eye size={19} color="#64748B" strokeWidth={1.8} />
                            )}
                          </Pressable>
                        </View>
                        {fieldState.error?.message ? (
                          <Text style={styles.errorText}>
                            {fieldState.error.message}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  />

                  {/* Helper Text for Registration */}
                  {mode === "register" && (
                    <Text style={styles.helperText}>
                      Use at least 8 characters with a mix of letters, numbers
                      and symbols.
                    </Text>
                  )}
                </View>
              )}

              {/* Primary Submit Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  mode === "forgot"
                    ? "Send reset link"
                    : mode === "reset"
                      ? "Save changes"
                      : mode === "login"
                        ? "Sign in"
                        : "Create account"
                }
                disabled={busy}
                onPress={() => {
                  void submit();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { opacity: busy || pressed ? 0.8 : 1 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === "forgot"
                      ? "Send reset link  →"
                      : mode === "reset"
                        ? "Save changes  →"
                        : mode === "login"
                          ? "Sign in  →"
                          : "Create account  →"}
                  </Text>
                )}
              </Pressable>

              {/* Social Login Buttons */}
              {(mode === "login" || mode === "register") && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                    disabled={busy}
                    onPress={() => {
                      void social("GOOGLE");
                    }}
                    style={({ pressed }) => [
                      styles.googleButton,
                      { opacity: busy || pressed ? 0.75 : 1 },
                    ]}
                  >
                    <GoogleIcon size={20} />
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </Pressable>

                  {Platform.OS === "ios" && catalog.data?.social.apple ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Sign in with Apple"
                      disabled={busy}
                      onPress={() => {
                        void social("APPLE");
                      }}
                      style={({ pressed }) => [
                        styles.appleButton,
                        { opacity: busy || pressed ? 0.75 : 1 },
                      ]}
                    >
                      <Text style={styles.appleButtonText}>
                        Continue with Apple
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}

              {/* Already have an account / Sign in toggle link */}
              {(mode === "login" || mode === "register") && (
                <View style={styles.switchAuthRow}>
                  <Text style={styles.switchAuthPrompt}>
                    {mode === "register"
                      ? "Already have an account? "
                      : "Don't have an account? "}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      mode === "register" ? "Sign in" : "Create account"
                    }
                    onPress={() =>
                      router.replace(mode === "register" ? "/login" : "/register")
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.switchAuthAction}>
                      {mode === "register" ? "Log in" : "Sign up"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Forgot password link for Login */}
              {mode === "login" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password?"
                  onPress={() => router.push("/reset-password")}
                  style={styles.forgotPasswordButton}
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot password?
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Footer Legal Terms */}
          <View style={styles.footerSection}>
            <Text style={styles.legalDisclaimer}>
              By creating an account, you agree to our{"\n"}
              <Text
                style={styles.legalLink}
                onPress={() => void Linking.openURL(termsUrl)}
              >
                Terms of Service
              </Text>
              {" and "}
              <Text
                style={styles.legalLink}
                onPress={() => void Linking.openURL(privacyUrl)}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 20,
  },
  circleBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E8EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  headerLogoCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLogoTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 20,
    color: "#182825",
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  titleSection: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  pageTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 32,
    lineHeight: 38,
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontFamily: "Outfit",
    fontSize: 16,
    lineHeight: 24,
    color: "#64748B",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E8EDEA",
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: "OutfitMedium",
    fontSize: 14.5,
    color: "#182322",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  inputErrorBorder: {
    borderColor: "#EF4444",
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    fontFamily: "Outfit",
    color: "#182322",
    marginLeft: 10,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    color: "#EF4444",
    marginTop: 5,
    marginLeft: 2,
  },
  helperText: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    lineHeight: 18,
    color: "#64748B",
    marginTop: 8,
  },
  primaryButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0F6E56",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#0F6E56",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontFamily: "OutfitMedium",
    fontSize: 16,
    color: "#FFFFFF",
  },
  googleButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
  },
  googleButtonText: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
    color: "#1E293B",
  },
  appleButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  appleButtonText: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
    color: "#FFFFFF",
  },
  switchAuthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  switchAuthPrompt: {
    fontFamily: "Outfit",
    fontSize: 14.5,
    color: "#64748B",
  },
  switchAuthAction: {
    fontFamily: "OutfitMedium",
    fontSize: 14.5,
    color: "#0F6E56",
  },
  forgotPasswordButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 6,
  },
  forgotPasswordText: {
    fontFamily: "Outfit",
    fontSize: 14,
    color: "#0F6E56",
  },
  messageBanner: {
    backgroundColor: "#E8F5EF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#CEEADC",
    gap: 10,
  },
  messageText: {
    fontFamily: "Outfit",
    fontSize: 14,
    color: "#0F6E56",
    lineHeight: 20,
  },
  messageButton: {
    alignSelf: "flex-start",
  },
  messageButtonText: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#0F6E56",
  },
  errorBannerWrapper: {
    marginBottom: 16,
  },
  footerSection: {
    marginTop: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  legalDisclaimer: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    lineHeight: 19,
    color: "#83928E",
    textAlign: "center",
  },
  legalLink: {
    color: "#0F6E56",
    fontFamily: "OutfitMedium",
  },
});
