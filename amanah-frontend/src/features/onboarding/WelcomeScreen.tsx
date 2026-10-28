import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  AmanahLogoBadge,
  Slide1Illustration,
  Slide2Illustration,
  Slide3Illustration,
} from "./OnboardingIllustrations";

const slides = [
  {
    title: "Track your money,\nwith clarity.",
    body: "Keep income and everyday spending\nin one calm place.",
    Illustration: Slide1Illustration,
  },
  {
    title: "Know your zakat,\nwithout the guesswork.",
    body: "See a running estimate from the money,\nassets, and debts you record.",
    Illustration: Slide2Illustration,
  },
  {
    title: "A little more ease,\nevery day.",
    body: "Prayer times, Quran and dua stay close\nto your daily finance.",
    Illustration: Slide3Illustration,
  },
];

export function WelcomeScreen() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const slide = slides[step]!;

  const handleNext = () => {
    if (step < 2) {
      setStep((v) => v + 1);
    } else {
      router.push("/register");
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((v) => v - 1);
    }
  };

  const handleSkip = () => {
    router.push("/register");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.brandContainer}>
            <AmanahLogoBadge size={36} />
            <Text style={styles.brandTitle}>Amanah</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip"
            onPress={handleSkip}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>

        {/* Illustration Area */}
        <View style={styles.illustrationWrapper}>
          <slide.Illustration />
        </View>

        {/* Content Area: Title & Subtitle */}
        <View style={styles.textContainer}>
          <Text accessibilityRole="header" style={styles.headingText}>
            {slide.title}
          </Text>
          <Text style={styles.subtitleText}>{slide.body}</Text>
        </View>

        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              accessibilityLabel={`Slide ${i + 1} of 3${i === step ? ", selected" : ""}`}
              style={[
                styles.dot,
                i === step ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionContainer}>
          {step === 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next"
              onPress={handleNext}
              style={({ pressed }) => [
                styles.primaryButton,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          )}

          {step === 1 && (
            <View style={styles.twoButtonRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={handleBack}
                style={({ pressed }) => [
                  styles.backPillButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next"
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.flexOne,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.primaryButtonText}>Next →</Text>
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.lastSlideActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Get started"
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.primaryButtonText}>Get started →</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                onPress={handleLogin}
                style={({ pressed }) => [
                  styles.loginLinkButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={styles.loginLinkText}>
                  I already have an account
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  scrollContent: {
    flexGrow: 1,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 20,
    color: "#182825",
    letterSpacing: -0.2,
  },
  skipButtonText: {
    fontFamily: "Outfit",
    fontSize: 16,
    color: "#7E8E8A",
  },
  illustrationWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  textContainer: {
    paddingHorizontal: 4,
    minHeight: 125,
    justifyContent: "center",
  },
  headingText: {
    fontFamily: "OutfitMedium",
    fontSize: 32,
    lineHeight: 38,
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitleText: {
    fontFamily: "Outfit",
    fontSize: 16,
    lineHeight: 24,
    color: "#5B6E6A",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 8,
    backgroundColor: "#0F6E56",
  },
  inactiveDot: {
    width: 8,
    backgroundColor: "#D6E3DE",
  },
  actionContainer: {
    width: "100%",
    marginTop: 8,
  },
  primaryButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0F6E56",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
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
  twoButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  flexOne: {
    flex: 1,
  },
  backPillButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E0DC",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
    color: "#182322",
  },
  lastSlideActions: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  loginLinkButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loginLinkText: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
    color: "#0F6E56",
    textAlign: "center",
  },
});
