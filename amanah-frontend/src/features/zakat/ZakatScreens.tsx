import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Info as InfoIcon,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
} from "lucide-react-native";
import Svg, { Path, Circle } from "react-native-svg";
import {
  Screen,
  Card,
  Copy,
  Button,
  ActionRow,
  Money,
  Empty,
  ErrorRetry,
  Field,
  Row,
  QueryState,
  useToast,
} from "../../design-system/components";
import { api, dataOf } from "../../core/api/client";
import { useAccountQuery, useAccountMutation } from "../../core/api/hooks";
import { useAuth } from "../../core/auth/AuthProvider";
import type { Zakat } from "../../core/api/types";
import { localDate } from "../../core/i18n/formatters";
import { getBdNisab, type PricingBenchmark } from "../market/bd-rates";
import {
  positive,
  date,
  useRetryKey,
  useFormGuard,
} from "../finance/form-tools";
import { periodProgress } from "../finance/value-tools";

function MosqueDomeIllustration() {
  return (
    <View style={styles.domeIllustrationWrapper}>
      <Svg width="110" height="110" viewBox="0 0 110 110" fill="none">
        {/* Soft mint circular glow */}
        <Circle cx="55" cy="55" r="48" fill="#E2F2E9" />
        {/* Crescent in the sky */}
        <Path
          d="M 52 14 C 47 16 43 21 44 27 C 45 33 50 37 56 36 C 51 37 46 34 45 29 C 44 24 47 18 52 14 Z"
          fill="#0F6E56"
        />
        {/* Mosque dome */}
        <Path
          d="M 32 82 L 32 52 C 32 32 55 26 55 26 C 55 26 78 32 78 52 L 78 82 Z"
          fill="#9CD8BE"
          opacity="0.5"
        />
        <Path
          d="M 36 82 L 36 56 C 36 40 55 34 55 34 C 55 34 74 40 74 56 L 74 82 Z"
          fill="#B8E6D3"
        />
        {/* Dome window */}
        <Path
          d="M 47 82 L 47 64 C 47 58 55 58 55 58 C 55 58 63 58 63 64 L 63 82 Z"
          fill="#8ACDB2"
        />
        {/* Spire / Finial */}
        <Path
          d="M 55 26 L 55 20"
          stroke="#0F6E56"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Botanical leaves around base */}
        <Path
          d="M 24 80 C 14 72 8 58 12 50 C 20 56 24 70 24 80 Z"
          fill="#71BC9F"
          opacity="0.85"
        />
        <Path
          d="M 86 80 C 96 72 102 58 98 50 C 90 56 86 70 86 80 Z"
          fill="#71BC9F"
          opacity="0.85"
        />
        <Path
          d="M 30 82 C 22 77 18 66 22 60 C 27 65 30 74 30 82 Z"
          fill="#9CD8BE"
          opacity="0.7"
        />
      </Svg>
    </View>
  );
}

function BullionBarsIcon({
  size = 22,
  color = "#0F6E56",
}: {
  size?: number;
  color?: string;
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
      <Path d="M4 14l3-6h10l3 6H4z" />
      <Path d="M2 20l2.5-5h15l2.5 5H2z" />
      <Path d="M9 8l1.5-3h3L15 8" />
    </Svg>
  );
}

function formatCurrency(
  amount: string | number | null | undefined,
  currency: string = "BDT",
) {
  const sym =
    currency === "BDT"
      ? "৳"
      : currency === "USD"
        ? "$"
        : currency === "EUR"
          ? "€"
          : currency === "GBP"
            ? "£"
            : currency;
  if (amount == null) return `${sym}0.00`;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${sym}0.00`;
  const parts = num.toFixed(2).split(".");
  const integer = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sym}${integer}.${parts[1]}`;
}

export function ZakatBreakdown({ summary: s }: { summary: Zakat }) {
  const router = useRouter();
  const currency = s.currency || "BDT";

  const estimateFormatted = formatCurrency(s.estimate ?? "0", currency);
  const eligibleAssetsFormatted = formatCurrency(
    s.eligibleAssets ?? "0",
    currency,
  );
  const debtsFormatted = `-${formatCurrency(s.eligibleLiabilities ?? "0", currency)}`;
  const netWealthFormatted = formatCurrency(
    s.netEligibleWealth ?? "0",
    currency,
  );

  const appliedRate = s.annualRate
    ? `${(parseFloat(s.annualRate) * 100).toFixed(1)}%`
    : "2.5%";

  const isBdCurrency = currency === "BDT";
  const [benchmark, setBenchmark] = useState<PricingBenchmark>("BAJUS");
  const isBajusActive = isBdCurrency && benchmark === "BAJUS";
  const bdNisabInfo = getBdNisab(s.nisabStandard);

  const effectiveNisabFormatted = isBajusActive
    ? bdNisabInfo.formattedNisab
    : formatCurrency(s.nisabValue ?? "0", currency);

  const effectiveNisabStandardName = isBajusActive
    ? s.nisabStandard === "GOLD"
      ? "Gold standard · BAJUS BD Market"
      : "Silver standard · BAJUS BD Market"
    : s.nisabStandard === "GOLD"
      ? "Gold standard"
      : "Silver standard";

  const effectiveNisabGramsText = isBajusActive
    ? s.nisabStandard === "GOLD"
      ? "Based on 87.48 grams (7.5 vori) pure gold @ ৳20,879/g"
      : "Based on 612.36 grams (52.5 vori) silver @ ৳220/g"
    : s.nisabGrams
      ? `Based on ${s.nisabGrams} grams of ${s.nisabStandard === "GOLD" ? "gold" : "silver"}`
      : "Based on pure metal threshold";

  const netWealthNum = parseFloat(s.netEligibleWealth ?? "0");
  const isBelowNisab = s.status === "BELOW_NISAB";
  const isEffectiveBelowNisab = isBajusActive
    ? netWealthNum < bdNisabInfo.nisabBDT
    : isBelowNisab;

  const startHijri = s.period?.startHijri || "Not set";
  const startDateCivil = s.period?.start || "Tap to set anniversary";
  const dueHijri = s.period?.endHijri || "—";
  const dueDateCivil = s.period?.end || "1 lunar year (Hawl)";

  const isPotentiallyDue = s.status === "POTENTIALLY_DUE";

  const metalPricePerGram =
    s.nisabValue && s.nisabGrams && parseFloat(s.nisabGrams) > 0
      ? (parseFloat(s.nisabValue) / parseFloat(s.nisabGrams)).toFixed(0)
      : null;
  const standardLabel =
    s.nisabStandard === "GOLD"
      ? "Gold price (cached)"
      : "Silver price (cached)";
  const currencySym = currency === "BDT" ? "৳" : currency;

  const progress =
    s.period?.start && s.period?.end
      ? periodProgress(
          s.period.start,
          s.period.end,
          new Date().toISOString().slice(0, 10),
        )
      : null;

  return (
    <View style={{ gap: 16 }}>
      {/* 1. Hero Card: Estimated zakat due */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeftCol}>
          <Text style={styles.heroSubtitle}>Estimated zakat due</Text>
          <Text style={styles.heroAmount}>{estimateFormatted}</Text>
          <Text style={styles.heroNote}>
            Based on your recorded values and chosen nisab standard.
          </Text>
          {s.status ? (
            <View
              style={{
                marginTop: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: isBelowNisab ? "#E2E8F0" : "#DCF5EC",
                borderRadius: 8,
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: isBelowNisab ? "#475569" : "#0F6E56",
                }}
              >
                {s.status.replace(/_/g, " ")}
              </Text>
            </View>
          ) : null}
        </View>
        <MosqueDomeIllustration />
      </View>

      {/* 2. Zakat Calculation Card */}
      <View style={styles.contentCard}>
        <Text style={styles.cardHeaderTitle}>Zakat calculation</Text>

        {/* Row 1: Eligible assets */}
        <View style={styles.calcRow}>
          <View style={styles.calcLabelRow}>
            <Text style={styles.calcLabelText}>Eligible assets</Text>
            <InfoIcon size={14} color="#94A3B8" />
          </View>
          <Text style={styles.calcValueText}>{eligibleAssetsFormatted}</Text>
        </View>

        {/* Row 2: Less eligible short-term debts */}
        <View style={styles.calcRow}>
          <View style={styles.calcLabelRow}>
            <Text style={styles.calcLabelText}>
              Less eligible short-term debts
            </Text>
            <InfoIcon size={14} color="#94A3B8" />
          </View>
          <Text style={styles.calcValueText}>{debtsFormatted}</Text>
        </View>

        <View style={styles.cardDivider} />

        {/* Row 3: Net wealth */}
        <View style={styles.calcRow}>
          <View style={styles.calcLabelRow}>
            <Text style={styles.calcLabelText}>Net wealth</Text>
            <InfoIcon size={14} color="#94A3B8" />
          </View>
          <Text style={styles.calcValueText}>{netWealthFormatted}</Text>
        </View>

        {/* Row 4: Applied zakat rate */}
        <View style={styles.calcRow}>
          <View style={styles.calcLabelRow}>
            <Text style={styles.calcLabelText}>Applied zakat rate</Text>
            <InfoIcon size={14} color="#94A3B8" />
          </View>
          <Text style={styles.calcValueText}>{appliedRate}</Text>
        </View>

        {/* Row 5: Estimate Highlight Box */}
        <View style={styles.estimateHighlightBox}>
          <View style={styles.calcLabelRow}>
            <Text style={styles.estimateBoxLabel}>Estimate</Text>
            <InfoIcon size={14} color="#0A4A38" />
          </View>
          <Text style={styles.estimateBoxValue}>{estimateFormatted}</Text>
        </View>
      </View>

      {/* 3. Nisab Standard Card */}
      <View style={styles.contentCard}>
        <View style={styles.cardTopBar}>
          <Text style={styles.cardHeaderTitle}>Nisab standard</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change nisab standard"
            onPress={() => router.push("/settings/nisab")}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.changeLinkText}>Change {">"}</Text>
          </Pressable>
        </View>

        {isBdCurrency ? (
          <View style={styles.benchmarkRowInCard}>
            <Text style={styles.benchmarkLabelInCard}>Pricing benchmark:</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="BAJUS (BD Market)"
                onPress={() => setBenchmark("BAJUS")}
                style={[
                  styles.benchmarkPill,
                  benchmark === "BAJUS"
                    ? styles.benchmarkPillActive
                    : styles.benchmarkPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.benchmarkPillText,
                    benchmark === "BAJUS" && styles.benchmarkPillTextActive,
                  ]}
                >
                  BAJUS (BD)
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="International Spot"
                onPress={() => setBenchmark("INTERNATIONAL")}
                style={[
                  styles.benchmarkPill,
                  benchmark === "INTERNATIONAL"
                    ? styles.benchmarkPillActive
                    : styles.benchmarkPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.benchmarkPillText,
                    benchmark === "INTERNATIONAL" &&
                      styles.benchmarkPillTextActive,
                  ]}
                >
                  Spot
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.nisabContentRow}>
          <View style={styles.nisabLeft}>
            <View style={styles.bullionBadge}>
              <BullionBarsIcon size={22} color="#0F6E56" />
            </View>
            <View style={styles.nisabTextCol}>
              <Text style={styles.nisabStandardTitle}>
                {effectiveNisabStandardName}
              </Text>
              <Text style={styles.nisabValueRow}>
                <Text style={styles.nisabValueBold}>
                  {effectiveNisabFormatted}
                </Text>
              </Text>
              <Text style={styles.nisabGramsSubtext}>
                {effectiveNisabGramsText}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.aboveNisabPill,
              isEffectiveBelowNisab && { backgroundColor: "#F1F5F9" },
            ]}
          >
            <View
              style={[
                styles.checkCircle,
                isEffectiveBelowNisab && { backgroundColor: "#64748B" },
              ]}
            >
              <Check size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text
              style={[
                styles.aboveNisabText,
                isEffectiveBelowNisab && { color: "#64748B" },
              ]}
            >
              {isEffectiveBelowNisab ? "Below nisab" : "Above nisab"}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {isBajusActive ? (
          <View style={{ gap: 6 }}>
            <View style={styles.cachedPriceRow}>
              <Text style={styles.cachedPriceLabel}>Gold 24K pure</Text>
              <Text style={styles.cachedPriceValue}>
                <Text style={{ fontFamily: "OutfitMedium" }}>৳20,879</Text> /g
                (৳243,530 /vori)
              </Text>
            </View>
            <View style={styles.cachedPriceRow}>
              <Text style={styles.cachedPriceLabel}>Gold 22K jewelry</Text>
              <Text style={styles.cachedPriceValue}>
                <Text style={{ fontFamily: "OutfitMedium" }}>৳19,125</Text> /g
                (৳223,074 /vori)
              </Text>
            </View>
            <View style={styles.cachedPriceRow}>
              <Text style={styles.cachedPriceLabel}>Silver 22K hallmark</Text>
              <Text style={styles.cachedPriceValue}>
                <Text style={{ fontFamily: "OutfitMedium" }}>৳220</Text> /g
                (৳2,566 /vori)
              </Text>
            </View>
            <Text style={styles.cachedPriceUpdated}>
              Source: BAJUS (www.bajus.org/gold-price) · Official BD Market
            </Text>
          </View>
        ) : (
          <View style={styles.cachedPriceRow}>
            <Text style={styles.cachedPriceLabel}>{standardLabel}</Text>
            <View style={styles.cachedPriceValueCol}>
              {metalPricePerGram ? (
                <Text style={styles.cachedPriceValue}>
                  <Text
                    style={{ fontFamily: "OutfitMedium" }}
                  >{`${currencySym}${metalPricePerGram}`}</Text>{" "}
                  per gram
                </Text>
              ) : null}
              {s.sourceAt ? (
                <Text style={styles.cachedPriceUpdated}>
                  {`Updated: ${s.sourceAt.slice(0, 10)}`}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </View>

      {/* 4. Zakat Anniversary Card */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zakat anniversary"
        onPress={() => router.push("/settings/nisab")}
        style={styles.contentCard}
      >
        <View style={styles.cardTopBar}>
          <Text style={styles.cardHeaderTitle}>Zakat anniversary</Text>
          <ChevronRight size={18} color="#64748B" strokeWidth={1.8} />
        </View>

        <View style={styles.anniversaryDatesRow}>
          {/* Start Date */}
          <View style={styles.dateColWithIcon}>
            <View style={styles.calendarBadge}>
              <CalendarIcon size={19} color="#0F6E56" strokeWidth={1.9} />
            </View>
            <View style={styles.dateTextCol}>
              <Text style={styles.dateTypeLabel}>Start date (Hijri)</Text>
              <Text style={styles.dateHijriText}>{startHijri}</Text>
              <Text style={styles.dateCivilText}>{startDateCivil}</Text>
            </View>
          </View>

          <View style={styles.verticalDateDivider} />

          {/* Due Date */}
          <View style={styles.dateTextCol}>
            <Text style={styles.dateTypeLabel}>Due date (Hijri)</Text>
            <Text style={styles.dateHijriText}>{dueHijri}</Text>
            <Text style={styles.dateCivilText}>{dueDateCivil}</Text>
          </View>
        </View>

        {/* Days remaining and progress */}
        {progress ? (
          <>
            <View style={styles.progressRow}>
              <Text
                style={styles.remainingDaysBold}
              >{`${progress.daysRemaining} days remaining`}</Text>
              <Text
                style={styles.totalDaysMuted}
              >{`${progress.daysElapsed} of ${progress.totalDays} days`}</Text>
            </View>

            <View style={styles.anniversaryProgressTrack}>
              <View
                style={[
                  styles.anniversaryProgressFill,
                  {
                    width: `${
                      progress.totalDays > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              Math.round(
                                (progress.daysElapsed / progress.totalDays) *
                                  100,
                              ),
                            ),
                          )
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </>
        ) : (
          <View style={styles.progressRow}>
            <Text style={styles.totalDaysMuted}>
              No qualifying period has been established.
            </Text>
          </View>
        )}
      </Pressable>

      {/* 5. Mark Zakat as Paid Primary Button */}
      {isPotentiallyDue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Record paid elsewhere"
          onPress={() => router.push("/zakat/record-payment")}
          style={({ pressed }) => [
            styles.markPaidButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.markPaidButtonText}>Record paid elsewhere</Text>
        </Pressable>
      ) : null}

      {/* 6. Legal & Religious Disclaimer Footer */}
      <View style={styles.disclaimerFooter}>
        <InfoIcon size={14} color="#64748B" style={{ marginTop: 1 }} />
        <Text style={styles.disclaimerText}>
          Amanah provides an estimate, not a religious ruling.{"\n"}
          Consult a qualified scholar for individual cases.
        </Text>
      </View>
    </View>
  );
}

export function ZakatScreen() {
  const router = useRouter();
  const q = useAccountQuery(["zakat"], async () =>
    dataOf(await api.GET("/v1/zakat/summary")),
  );

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar Header */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/home")
            }
            style={({ pressed }) => [
              styles.circleButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ArrowLeft size={20} color="#182322" strokeWidth={2.2} />
          </Pressable>

          <Text accessibilityRole="header" style={styles.screenHeaderTitle}>
            Your zakat
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zakat information"
            onPress={() => router.push("/settings/about")}
            style={({ pressed }) => [
              styles.circleButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <InfoIcon size={20} color="#182322" strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* Content */}
        {q.data ? <ZakatBreakdown summary={q.data} /> : null}
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
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 16,
  },
  circleButton: {
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
  screenHeaderTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 18,
    color: "#111827",
    letterSpacing: -0.2,
  },
  heroCard: {
    backgroundColor: "#EEF8F1",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#D7ECE0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 8,
  },
  heroSubtitle: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#4B6B60",
    marginBottom: 4,
  },
  heroAmount: {
    fontFamily: "OutfitMedium",
    fontSize: 38,
    lineHeight: 44,
    color: "#0A4A38",
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  heroNote: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    lineHeight: 18,
    color: "#5B6F68",
  },
  domeIllustrationWrapper: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EDF2EE",
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeaderTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 16.5,
    color: "#111827",
  },
  calcRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  calcLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calcLabelText: {
    fontFamily: "Outfit",
    fontSize: 14.5,
    color: "#182322",
  },
  calcValueText: {
    fontFamily: "OutfitMedium",
    fontSize: 15.5,
    color: "#111827",
  },
  cardDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F3",
    marginVertical: 10,
  },
  estimateHighlightBox: {
    backgroundColor: "#EEF8F1",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  estimateBoxLabel: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
    color: "#0A4A38",
  },
  estimateBoxValue: {
    fontFamily: "OutfitMedium",
    fontSize: 18,
    color: "#0A4A38",
  },
  cardTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  benchmarkRowInCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2EE",
  },
  benchmarkLabelInCard: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  benchmarkPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  benchmarkPillActive: {
    backgroundColor: "#0F6E56",
    borderColor: "#0F6E56",
  },
  benchmarkPillInactive: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  benchmarkPillText: {
    fontFamily: "OutfitMedium",
    fontSize: 11,
    color: "#64748B",
  },
  benchmarkPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  changeLinkText: {
    fontFamily: "OutfitMedium",
    fontSize: 13.5,
    color: "#0F6E56",
  },
  nisabContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nisabLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  bullionBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF8F1",
    alignItems: "center",
    justifyContent: "center",
  },
  nisabTextCol: {
    gap: 2,
    flex: 1,
  },
  nisabStandardTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
    color: "#111827",
  },
  nisabValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nisabValueBold: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#182322",
  },
  illustrativeText: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  nisabGramsSubtext: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  aboveNisabPill: {
    backgroundColor: "#E1F5EE",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#0F6E56",
    alignItems: "center",
    justifyContent: "center",
  },
  aboveNisabText: {
    fontFamily: "OutfitMedium",
    fontSize: 12,
    color: "#0F6E56",
  },
  cachedPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cachedPriceLabel: {
    fontFamily: "Outfit",
    fontSize: 11.5,
    color: "#64748B",
  },
  cachedPriceValueCol: {
    alignItems: "flex-end",
    gap: 1,
  },
  cachedPriceValue: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    color: "#182322",
  },
  cachedPriceUpdated: {
    fontFamily: "Outfit",
    fontSize: 10.5,
    color: "#64748B",
  },
  anniversaryDatesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dateColWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  calendarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EBF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  dateTextCol: {
    gap: 1,
    flex: 1,
  },
  dateTypeLabel: {
    fontFamily: "Outfit",
    fontSize: 11.5,
    color: "#64748B",
  },
  dateHijriText: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#111827",
  },
  dateCivilText: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  verticalDateDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  remainingDaysBold: {
    fontFamily: "OutfitMedium",
    fontSize: 13.5,
    color: "#182322",
  },
  totalDaysMuted: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  anniversaryProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EDF2EE",
    marginTop: 8,
    overflow: "hidden",
  },
  anniversaryProgressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#0F6E56",
    width: "92%",
  },
  markPaidButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0F6E56",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#0F6E56",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  markPaidButtonText: {
    fontFamily: "OutfitMedium",
    fontSize: 16,
    color: "#FFFFFF",
  },
  disclaimerFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  disclaimerText: {
    fontFamily: "Outfit",
    fontSize: 11.5,
    lineHeight: 16,
    color: "#64748B",
    textAlign: "center",
  },
});

const paymentSchema = z.object({
  amount: positive,
  paidOn: date,
  note: z.string().max(500),
  confirmOverpayment: z.boolean(),
});
type PaymentForm = z.infer<typeof paymentSchema>;
function PaymentEditor({
  assessmentId,
  summary,
  currency,
  initialAmount,
}: {
  assessmentId?: string;
  summary?: Zakat;
  currency: string;
  initialAmount: string;
}) {
  const router = useRouter();
  const { account } = useAuth();
  const key = useRetryKey();
  const toast = useToast();
  const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: initialAmount,
      paidOn: localDate(account!.preferences.timezone),
      note: "",
      confirmOverpayment: false,
    },
  });
  useFormGuard(form.formState.isDirty && !success);
  useEffect(() => {
    if (success)
      router.replace({
        pathname: "/zakat/success",
        params: { yearId: success },
      });
  }, [success, router]);
  const mutation = useAccountMutation(async (v: PaymentForm) => {
    const body = {
      ...v,
      currency: currency as Zakat["currency"],
      ...(assessmentId
        ? { zakatYearId: assessmentId }
        : { snapshotFingerprint: summary!.fingerprint }),
    };
    return dataOf(
      await api.POST("/v1/zakat/payments", {
        params: { header: { "idempotency-key": key(body) } },
        body,
      }),
    );
  });
  const field = (name: "amount" | "paidOn" | "note", label: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          value={field.value}
          onChangeText={field.onChange}
          error={fieldState.error?.message}
          keyboardType={name === "amount" ? "decimal-pad" : "default"}
        />
      )}
    />
  );
  return (
    <>
      <Card>
        <Copy>
          Record a payment you made outside Amanah. This does not send money.
        </Copy>
        <Copy>{currency}</Copy>
        {field("amount", "Amount")}
        {field("paidOn", "Date")}
        {field("note", "Note")}
        <Controller
          control={form.control}
          name="confirmOverpayment"
          render={({ field }) => (
            <Row>
              <Copy style={{ flex: 1 }}>
                Confirm recording more than the assessment
              </Copy>
              <Switch
                accessibilityLabel="Confirm recording more than the assessment"
                value={field.value}
                onValueChange={field.onChange}
              />
            </Row>
          )}
        />
      </Card>
      {mutation.error ? <ErrorRetry error={mutation.error} /> : null}
      <Button
        label="Record payment"
        busy={mutation.isPending}
        onPress={() => {
          void form.handleSubmit(async (v) => {
            try {
              const p = await mutation.mutateAsync(v);
              form.reset(v);
              setSuccess(p.zakatYearId);
              toast("Recorded");
            } catch {
              /* Keep draft for retry. */
            }
          })();
        }}
      />
    </>
  );
}
export function RecordPaymentScreen() {
  const { yearId } = useLocalSearchParams<{ yearId?: string }>();
  const q = useAccountQuery(["payment-assessment", yearId], async () =>
    yearId
      ? {
          year: dataOf(
            await api.GET("/v1/zakat/history/{id}", {
              params: { path: { id: yearId } },
            }),
          ),
        }
      : { summary: dataOf(await api.GET("/v1/zakat/summary")) },
  );
  return (
    <Screen title="Record paid elsewhere" back>
      <QueryState query={q}>
        {q.data?.year ? (
          <PaymentEditor
            assessmentId={q.data.year.id}
            currency={q.data.year.currency}
            initialAmount={q.data.year.remainingAmount}
          />
        ) : q.data?.summary?.status === "POTENTIALLY_DUE" ? (
          <PaymentEditor
            summary={q.data.summary}
            currency={q.data.summary.currency}
            initialAmount={q.data.summary.estimate ?? ""}
          />
        ) : q.data ? (
          <Empty message="A completed period, reviewed policy and fresh assessment are required before recording a new assessment." />
        ) : null}
      </QueryState>
    </Screen>
  );
}
export function PaymentSuccessScreen() {
  const router = useRouter();
  const { yearId } = useLocalSearchParams<{ yearId?: string }>();
  return (
    <Screen title="Recorded">
      <Card tint>
        <Copy size={24}>Payment record saved</Copy>
        <Copy>No money was transferred.</Copy>
        <Copy muted>
          The historical calculation and its source snapshots have been
          preserved.
        </Copy>
      </Card>
      {yearId ? (
        <Button
          label="View assessment"
          onPress={() => router.replace(`/zakat/history/${yearId}`)}
        />
      ) : null}
      <Button
        secondary
        label="Zakat history"
        onPress={() => router.replace("/zakat/history")}
      />
    </Screen>
  );
}
export function ZakatHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const q = useInfiniteQuery({
    queryKey: ["user", user!.id, "zakat-history"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      dataOf(
        await api.GET("/v1/zakat/history", {
          params: {
            query: { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) },
          },
        }),
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Screen title="Zakat history" back>
      <QueryState query={q}>
        {rows.length ? (
          rows.map((y) => (
            <Card key={y.id}>
              <ActionRow
                label={`${y.periodStart ?? "Assessment"} → ${y.periodEnd ?? ""}`}
                detail={y.recordStatus.replaceAll("_", " ")}
                onPress={() => router.push(`/zakat/history/${y.id}`)}
              />
              <Money value={y.assessedAmount} currency={y.currency} />
              <Copy
                muted
              >{`Recorded: ${y.recordedAmount} · Remaining: ${y.remainingAmount}`}</Copy>
            </Card>
          ))
        ) : (
          <Empty
            message="No historical assessments yet."
            label="Zakat estimate"
            action={() => router.push("/zakat")}
          />
        )}{" "}
        {q.hasNextPage ? (
          <Button
            secondary
            label="Load more"
            busy={q.isFetchingNextPage}
            onPress={() => {
              void q.fetchNextPage();
            }}
          />
        ) : null}
      </QueryState>
    </Screen>
  );
}
export function ZakatHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useAccountQuery(["zakat-history", id], async () =>
    dataOf(
      await api.GET("/v1/zakat/history/{id}", { params: { path: { id } } }),
    ),
  );
  return (
    <Screen title="Historical assessment" back>
      <QueryState query={q}>
        {q.data ? (
          <>
            <Copy muted>
              This is the saved assessment. It is not recalculated at today's
              prices.
            </Copy>
            <ZakatBreakdown summary={q.data.snapshot} />
            <Card>
              <Copy>Payment records</Copy>
              {q.data.payments.map((p) => (
                <Card key={p.id}>
                  <Money value={p.amount} currency={p.currency} size={20} />
                  <Copy>{p.paidOn}</Copy>
                  <Copy muted>{p.note ?? ""}</Copy>
                </Card>
              ))}
              <Copy>{`Remaining: ${q.data.remainingAmount} ${q.data.currency}`}</Copy>
            </Card>
            <Button
              label="Record paid elsewhere"
              onPress={() =>
                router.push({
                  pathname: "/zakat/record-payment",
                  params: { yearId: id },
                })
              }
            />
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}
