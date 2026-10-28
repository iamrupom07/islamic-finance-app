import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  ChevronRight,
  PlusCircle,
  CreditCard,
  AlertCircle,
} from "lucide-react-native";
import { useTheme } from "../../design-system/ThemeProvider";
import type { Zakat } from "../../core/api/types";
import { periodProgress } from "../finance/value-tools";

export function SproutWhiteIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M7 20h10" />
      <Path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <Path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4.1 5.5.8z" />
      <Path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.4 2-4.6-2.7 0-4.3.7-5.2 2z" />
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
  return `${sym}${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface ZakatSummaryCardProps {
  zakat?: Zakat | null;
  isTablet?: boolean;
}

export function ZakatSummaryCard({ zakat, isTablet }: ZakatSummaryCardProps) {
  const router = useRouter();
  const { dark: isDark } = useTheme();

  const status = zakat?.status ?? "CALCULATION_UNAVAILABLE";
  const currency = zakat?.currency ?? "BDT";
  const estimate = zakat?.estimate;
  const netWealth = zakat?.netEligibleWealth;
  const nisabValue = zakat?.nisabValue;
  const nisabStandard = zakat?.nisabStandard ?? "SILVER";
  const nisabGrams = zakat?.nisabGrams;

  const hasEstimate = estimate != null && parseFloat(estimate) > 0;
  const isPotentiallyDue = status === "POTENTIALLY_DUE";
  const isYearInProgress = status === "YEAR_IN_PROGRESS";
  const isBelowNisab = status === "BELOW_NISAB";
  const isNoAssets = status === "NO_ASSETS";
  const isUnavailable =
    status === "CALCULATION_UNAVAILABLE" || status === "DATA_STALE";

  const estimateFormatted = formatCurrency(estimate ?? "0", currency);
  const netWealthFormatted =
    netWealth != null ? formatCurrency(netWealth, currency) : "—";
  const nisabFormatted =
    nisabValue != null ? formatCurrency(nisabValue, currency) : null;

  // Nisab calculations
  const standardName = nisabStandard === "GOLD" ? "Gold" : "Silver";
  const gramsLabel = nisabGrams
    ? `${nisabGrams}g`
    : nisabStandard === "GOLD"
      ? "87.48g"
      : "612.36g";

  let shortfallFormatted: string | null = null;
  let surplusFormatted: string | null = null;
  if (netWealth != null && nisabValue != null) {
    const netNum = parseFloat(netWealth);
    const nisabNum = parseFloat(nisabValue);
    if (!isNaN(netNum) && !isNaN(nisabNum)) {
      if (netNum < nisabNum) {
        shortfallFormatted = formatCurrency(
          (nisabNum - netNum).toFixed(2),
          currency,
        );
      } else {
        surplusFormatted = formatCurrency(
          (netNum - nisabNum).toFixed(2),
          currency,
        );
      }
    }
  }

  // Hawl progress calculation
  const today = new Date().toISOString().slice(0, 10);
  const progress =
    zakat?.period?.start && zakat?.period?.end
      ? periodProgress(zakat.period.start, zakat.period.end, today)
      : null;

  const progressPct =
    progress && progress.totalDays > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((progress.daysElapsed / progress.totalDays) * 100),
          ),
        )
      : 0;

  return (
    <View
      style={[
        styles.zakatCard,
        isTablet && { flex: 1, marginBottom: 0 },
        isDark && {
          backgroundColor: "#132A22",
          borderColor: "#1E3D32",
        },
      ]}
    >
      {/* Top row */}
      <View style={styles.zakatTopRow}>
        <View style={styles.sproutBadge}>
          <SproutWhiteIcon size={24} />
        </View>

        <View style={styles.zakatAmountCol}>
          <Text style={[styles.zakatLabel, isDark && { color: "#A7D5C4" }]}>
            Zakat summary
          </Text>

          {isUnavailable ? (
            <View style={styles.zakatStatusBadge}>
              <Text style={styles.zakatStatusText}>
                CALCULATION UNAVAILABLE
              </Text>
            </View>
          ) : isNoAssets ? (
            <View style={styles.zakatStatusBadge}>
              <Text style={styles.zakatStatusText}>NO ASSETS</Text>
            </View>
          ) : isBelowNisab ? (
            <View style={styles.zakatDueRow}>
              <Text
                style={[styles.zakatDueAmount, isDark && { color: "#E8F5EE" }]}
              >
                {formatCurrency("0", currency)}
              </Text>
              <Text style={[styles.zakatDueLabel, { color: "#64748B" }]}>
                due
              </Text>
              <View
                style={[
                  styles.statusBadgeSmall,
                  { backgroundColor: "#F1F5F9" },
                ]}
              >
                <Text
                  style={[styles.statusBadgeSmallText, { color: "#475569" }]}
                >
                  BELOW NISAB
                </Text>
              </View>
            </View>
          ) : isPotentiallyDue ? (
            <View style={styles.zakatDueRow}>
              <Text
                style={[styles.zakatDueAmount, isDark && { color: "#E8F5EE" }]}
              >
                {estimateFormatted}
              </Text>
              <Text style={styles.zakatDueLabel}>due</Text>
              <View
                style={[
                  styles.statusBadgeSmall,
                  { backgroundColor: "#DCFCE7" },
                ]}
              >
                <Text
                  style={[styles.statusBadgeSmallText, { color: "#15803D" }]}
                >
                  DUE NOW
                </Text>
              </View>
            </View>
          ) : isYearInProgress ? (
            <View style={styles.zakatDueRow}>
              <Text
                style={[styles.zakatDueAmount, isDark && { color: "#E8F5EE" }]}
              >
                {estimateFormatted}
              </Text>
              <Text style={[styles.zakatDueLabel, { color: "#0F6E56" }]}>
                estimated
              </Text>
            </View>
          ) : hasEstimate ? (
            <View style={styles.zakatDueRow}>
              <Text
                style={[styles.zakatDueAmount, isDark && { color: "#E8F5EE" }]}
              >
                {estimateFormatted}
              </Text>
              <Text style={styles.zakatDueLabel}>due</Text>
            </View>
          ) : (
            <View style={styles.zakatStatusBadge}>
              <Text style={styles.zakatStatusText}>
                {status.replace(/_/g, " ")}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View breakdown"
          onPress={() => router.push("/zakat")}
          style={({ pressed }) => [
            styles.viewBreakdownPill,
            isDark && { backgroundColor: "#1D3B30", borderColor: "#2E5748" },
            { opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text
            style={[styles.viewBreakdownText, isDark && { color: "#E8F5EE" }]}
          >
            View breakdown
          </Text>
          <ChevronRight
            size={14}
            color={isDark ? "#A7D5C4" : "#182322"}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* Explanatory notes for special states */}
      {isUnavailable ? (
        <View style={styles.unavailableBox}>
          <AlertCircle size={14} color="#0F6E56" strokeWidth={2} />
          <Text
            style={[styles.unavailableText, isDark && { color: "#A7D5C4" }]}
          >
            {zakat?.reasons?.[0] ??
              "Reviewed zakat policy and market rates required."}
          </Text>
        </View>
      ) : isNoAssets ? (
        <View style={styles.noAssetsRow}>
          <Text style={[styles.noAssetsText, isDark && { color: "#94A3B8" }]}>
            No zakat-eligible assets recorded. Add cash, gold, or silver to
            estimate.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add new asset"
            onPress={() => router.push("/assets/new")}
            style={styles.addAssetPill}
          >
            <PlusCircle size={13} color="#0F6E56" strokeWidth={2} />
            <Text style={styles.addAssetText}>Add asset</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Net wealth & Nisab comparison row */}
          <View style={styles.wealthRow}>
            <Text style={[styles.wealthLabel, isDark && { color: "#94A3B8" }]}>
              Net wealth{" "}
              <Text
                style={[styles.wealthValue, isDark && { color: "#E8F5EE" }]}
              >
                {netWealthFormatted}
              </Text>
            </Text>

            {nisabFormatted ? (
              <>
                <View style={styles.wealthDivider} />
                <Text
                  style={[styles.wealthLabel, isDark && { color: "#94A3B8" }]}
                >
                  {`${standardName} nisab (${gramsLabel}): `}
                  <Text
                    style={[
                      styles.nisabStatusValue,
                      isDark && { color: "#5EEAD4" },
                    ]}
                  >
                    {nisabFormatted}
                  </Text>
                </Text>
              </>
            ) : null}
          </View>

          {/* Shortfall or surplus context */}
          {isBelowNisab && shortfallFormatted ? (
            <Text
              style={[styles.shortfallText, isDark && { color: "#94A3B8" }]}
            >
              {`Shortfall: ${shortfallFormatted} below ${standardName.toLowerCase()} nisab threshold`}
            </Text>
          ) : surplusFormatted ? (
            <Text style={[styles.surplusText, isDark && { color: "#5EEAD4" }]}>
              {`Exceeds ${standardName.toLowerCase()} threshold by ${surplusFormatted}`}
            </Text>
          ) : null}

          {/* Hawl / Period Progress Bar */}
          {progress ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressLabelsRow}>
                <Text
                  style={[
                    styles.anniversaryText,
                    isDark && { color: "#A7D5C4" },
                  ]}
                >
                  {`${progress.daysRemaining} days remaining in hawl`}
                </Text>
                <Text
                  style={[
                    styles.progressRatioText,
                    isDark && { color: "#64748B" },
                  ]}
                >
                  {`${progress.daysElapsed} of ${progress.totalDays}d (${progressPct}%)`}
                </Text>
              </View>

              <View
                style={[
                  styles.progressBarTrack,
                  isDark && { backgroundColor: "#1D3B30" },
                ]}
              >
                <View
                  style={[styles.progressBarFill, { width: `${progressPct}%` }]}
                />
              </View>

              <Text
                style={[
                  styles.periodBoundsText,
                  isDark && { color: "#64748B" },
                ]}
              >
                {`Period: ${zakat?.period?.startHijri || zakat?.period?.start} → ${zakat?.period?.endHijri || zakat?.period?.end}`}
              </Text>
            </View>
          ) : zakat?.period ? (
            <Text
              style={[styles.anniversaryText, isDark && { color: "#5A6F68" }]}
            >
              {`Period: ${zakat.period.start} → ${zakat.period.end}`}
            </Text>
          ) : null}

          {/* Quick Action when Potentially Due */}
          {isPotentiallyDue ? (
            <View style={styles.quickActionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Record payment"
                onPress={() => router.push("/zakat/record-payment")}
                style={({ pressed }) => [
                  styles.recordPaymentButton,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <CreditCard size={14} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.recordPaymentText}>Record payment</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  zakatCard: {
    backgroundColor: "#EEF8F1",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D7ECE0",
    marginBottom: 14,
  },
  zakatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sproutBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#74AC2B",
    alignItems: "center",
    justifyContent: "center",
  },
  zakatAmountCol: {
    flex: 1,
    marginLeft: 2,
  },
  zakatLabel: {
    fontFamily: "Outfit",
    fontSize: 13,
    color: "#5A6F68",
    marginBottom: 2,
  },
  zakatDueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  zakatDueAmount: {
    fontFamily: "OutfitMedium",
    fontSize: 24,
    color: "#0A3828",
  },
  zakatDueLabel: {
    fontFamily: "OutfitMedium",
    fontSize: 16,
    color: "#0F6E56",
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 2,
  },
  statusBadgeSmallText: {
    fontFamily: "OutfitMedium",
    fontSize: 10,
    fontWeight: "700",
  },
  zakatStatusBadge: {
    backgroundColor: "#E1F5EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  zakatStatusText: {
    fontFamily: "OutfitMedium",
    fontSize: 11,
    color: "#0F6E56",
    fontWeight: "700",
  },
  viewBreakdownPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C8E4D7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  viewBreakdownText: {
    fontFamily: "OutfitMedium",
    fontSize: 12,
    color: "#182322",
  },
  unavailableBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#E6F4EE",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unavailableText: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#0F6E56",
    flex: 1,
  },
  noAssetsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 8,
  },
  noAssetsText: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },
  addAssetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C8E4D7",
  },
  addAssetText: {
    fontFamily: "OutfitMedium",
    fontSize: 11.5,
    color: "#0F6E56",
  },
  wealthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    flexWrap: "wrap",
  },
  wealthLabel: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    color: "#5A6F68",
  },
  wealthValue: {
    fontFamily: "OutfitMedium",
    color: "#182322",
  },
  wealthDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#CFE6DB",
    marginHorizontal: 8,
  },
  nisabStatusValue: {
    fontFamily: "OutfitMedium",
    color: "#0F6E56",
  },
  shortfallText: {
    fontFamily: "Outfit",
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 4,
  },
  surplusText: {
    fontFamily: "Outfit",
    fontSize: 11.5,
    color: "#0F6E56",
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  anniversaryText: {
    fontFamily: "OutfitMedium",
    fontSize: 12,
    color: "#0F6E56",
  },
  progressRatioText: {
    fontFamily: "Outfit",
    fontSize: 11,
    color: "#64748B",
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2EDE6",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#0F6E56",
  },
  periodBoundsText: {
    fontFamily: "Outfit",
    fontSize: 11,
    color: "#5A6F68",
    marginTop: 4,
  },
  quickActionRow: {
    marginTop: 12,
    flexDirection: "row",
  },
  recordPaymentButton: {
    backgroundColor: "#0F6E56",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordPaymentText: {
    fontFamily: "OutfitMedium",
    fontSize: 12.5,
    color: "#FFFFFF",
  },
});
