import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  Bell,
  MapPin,
  ChevronRight,
  Plus,
  ShoppingCart,
  Briefcase,
  Heart,
  BookOpen,
  CircleArrowUp,
  CircleArrowDown,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
} from "lucide-react-native";
import { Screen } from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
import { useAccountQuery } from "../../core/api/hooks";
import { api, dataOf } from "../../core/api/client";
import { useAuth } from "../../core/auth/AuthProvider";
import { localDate } from "../../core/i18n/formatters";
import { CoinsPlantIllustration } from "../assets/AssetIcons";
import { processPrayerSchedule } from "../prayer/prayer-schedule";
import { ZakatSummaryCard } from "../zakat/ZakatSummaryCard";
import { metalPreview } from "../finance/value-tools";

function MosqueIcon({
  size = 22,
  color = "#0F6E56",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2.2a.5.5 0 0 1 .5.5v.6c1.65.48 2.85 1.95 2.85 3.75v1.65h-6.7V7.05c0-1.8 1.2-3.27 2.85-3.75V2.7a.5.5 0 0 1 .5-.5z" />
      <Path d="M7 9.5h10V20h-3v-3.5a2 2 0 0 0-4 0V20H7V9.5z" />
      <Path d="M3.5 7.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 .75.75v12.5h-2V7.5z" />
      <Path d="M4.2 4.5a.5.5 0 0 1 .6 0l.7.6v1.4h-2V5.1l.7-.6z" />
      <Path d="M18.5 7.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 .75.75v12.5h-2V7.5z" />
      <Path d="M19.2 4.5a.5.5 0 0 1 .6 0l.7.6v1.4h-2V5.1l.7-.6z" />
    </Svg>
  );
}

function DuaHandsIcon({
  size = 20,
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
      <Path d="M7 11V5a2 2 0 0 1 4 0v6" />
      <Path d="M17 11V5a2 2 0 0 0-4 0v6" />
      <Path d="M7 11c0 4 2 7 5 7s5-3 5-7" />
      <Path d="M8 15l-3 4" />
      <Path d="M16 15l3 4" />
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

export function HomeScreen() {
  const router = useRouter();
  const { colors, dark: isDark, locale } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const query = useAccountQuery(
    ["home"],
    async () => dataOf(await api.GET("/v1/home")),
    true,
  );
  const assetsQuery = useAccountQuery(
    ["user-assets-home"],
    async () =>
      dataOf(await api.GET("/v1/assets", { params: { query: { limit: 50 } } })),
    true,
  );
  const d = query.data;
  const { account } = useAuth();
  const [countdown, setCountdown] = useState<string>("01:12:18");

  // Data helpers
  const currency =
    d?.monthlyFinance?.currency ?? account?.preferences?.currency ?? "BDT";

  const marketQuery = useAccountQuery(
    ["market", currency],
    async () =>
      dataOf(
        await api.GET("/v1/market/daily", {
          params: { query: { currency } },
        }),
      ),
    true,
  );

  const prayer =
    d?.prayer?.date ===
    localDate(account?.preferences?.timezone ?? "Asia/Dhaka")
      ? d.prayer
      : (d?.prayer ?? null);

  const [currentNow, setCurrentNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const processedPrayer = useMemo(() => {
    return processPrayerSchedule(prayer, currentNow);
  }, [prayer, currentNow]);

  // Live countdown to next prayer
  useEffect(() => {
    if (!prayer?.nextPrayer?.at) return;
    const target = new Date(prayer.nextPrayer.at).getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const h = Math.floor(diff / 3600000)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((diff % 3600000) / 60000)
        .toString()
        .padStart(2, "0");
      const s = Math.floor((diff % 60000) / 1000)
        .toString()
        .padStart(2, "0");
      setCountdown(`${h}:${m}:${s}`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [prayer?.nextPrayer?.at]);

  // User display name from email or profile
  const rawEmail = account?.user?.email ?? "";
  const nameFromEmail = rawEmail.includes("@")
    ? (rawEmail.split("@")[0] ?? "Amina")
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Amina";
  const userName = nameFromEmail || "Amina";

  const rawIncome = d?.monthlyFinance?.income;
  const rawExpenses = d?.monthlyFinance?.expenses;
  const incomeFormatted = formatCurrency(rawIncome ?? "0", currency);
  const expensesFormatted = formatCurrency(rawExpenses ?? "0", currency);

  const incomeNum = parseFloat(rawIncome ?? "0") || 0;
  const expensesNum = parseFloat(rawExpenses ?? "0") || 0;
  const netAmount = incomeNum - expensesNum;
  const isNetIncome = netAmount >= 0;
  const absNet = Math.abs(netAmount);
  const netFormatted = formatCurrency(absNet.toFixed(2), currency);
  const exactRate = incomeNum > 0 ? (absNet / incomeNum) * 100 : 0;
  const savingsRateText =
    incomeNum > 0
      ? isNetIncome
        ? expensesNum === 0 || netAmount >= incomeNum
          ? "100% saved"
          : exactRate >= 99 && exactRate < 100
            ? `${exactRate.toFixed(1)}% saved`
            : `${Math.round(exactRate)}% saved`
        : exactRate >= 99 && exactRate < 100
          ? `${exactRate.toFixed(1)}% deficit`
          : `${Math.round(exactRate)}% deficit`
      : null;
  const potentialZakat =
    isNetIncome && absNet > 0 ? (absNet * 0.025).toFixed(2) : null;
  const potentialZakatFormatted = potentialZakat
    ? formatCurrency(potentialZakat, currency)
    : null;

  // Assets info
  const userAssets = assetsQuery.data?.items ?? [];
  const goldRate = marketQuery.data?.goldPerGram;
  const silverRate = marketQuery.data?.silverPerGram;

  const calculatedTotalAssets = userAssets.reduce((sum, item) => {
    if (item.valuationMode === "METAL_RATE") {
      const rate = item.type === "GOLD" ? goldRate : silverRate;
      if (rate && item.weightGrams && item.purity) {
        const val = metalPreview(item.weightGrams, "g", item.purity, rate);
        return sum + (val ? parseFloat(val) : 0);
      }
      return sum;
    }
    return sum + (parseFloat(item.declaredValue ?? "0") || 0);
  }, 0);
  const formattedAssetsTotal =
    userAssets.length > 0
      ? formatCurrency(calculatedTotalAssets, currency)
      : "—";

  // Prayer display calculations
  const isForbidden = Boolean(processedPrayer?.activeForbidden);
  const activeWaqt = processedPrayer?.activeWaqt ?? null;
  const nextPrayerName =
    processedPrayer?.nextPrayer?.name ?? prayer?.nextPrayer?.name ?? "Prayer";
  const displayCountdown =
    processedPrayer?.nextPrayer?.remainingFormatted ?? countdown;
  const prayerCity =
    prayer?.city ?? account?.preferences?.cityId ?? "City not set";

  const prayerSchedule = (prayer?.timings ?? []).map((sp) => ({
    name: sp.name,
    time: sp.label ? sp.label.replace(/^0/, "") : "",
    isNext: sp.name.toLowerCase() === nextPrayerName.toLowerCase(),
  }));

  const recentList =
    d?.recentTransactions && d.recentTransactions.length > 0
      ? d.recentTransactions.map((tx) => {
          const isInc = tx.type === "INCOME";
          let Icon = ShoppingCart;
          let bg = "#FEECEC";
          let color = "#EF4444";
          if (isInc) {
            Icon = Briefcase;
            bg = "#EBF5FF";
            color = "#0284C7";
          } else if (tx.isSadaqah || tx.category === "SADAQAH") {
            Icon = Heart;
            bg = "#E1F5EE";
            color = "#EF4444";
          }
          return {
            id: tx.id,
            category:
              tx.category.charAt(0).toUpperCase() +
              tx.category.slice(1).toLowerCase().replace(/_/g, " "),
            subtitle: `${tx.localDate} • ${tx.description ?? (isInc ? "Received" : "Payment")}`,
            amount:
              (isInc ? "+" : "-") + formatCurrency(tx.amount, tx.currency),
            isIncome: isInc,
            Icon,
            color,
            bg,
          };
        })
      : [];

  return (
    <Screen
      tabs
      maxWidth={isTablet ? 820 : 680}
      refresh={() => {
        void query.refetch();
      }}
      busy={query.isRefetching}
    >
      {/* 1. Top Header with Mosque Avatar and Notifications Bell */}
      <View style={styles.topBar}>
        <View style={styles.avatarGroup}>
          <View style={styles.avatarBadge}>
            <MosqueIcon size={24} color="#0F6E56" />
          </View>
          <View style={styles.avatarTextCol}>
            <Text style={styles.greetingSubtext}>As-salamu alaikum</Text>
            <Text style={styles.userNameText}>{userName}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push("/settings/notification")}
          style={({ pressed }) => [
            styles.bellCircleButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Bell size={20} color="#182322" strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* 2. Hero Title */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>
          Track your money{"\n"}and know your zakat
        </Text>
      </View>

      {/* 3 & 4. Next Prayer and Zakat Cards */}
      <View
        style={
          isTablet
            ? { flexDirection: "row", gap: 14, marginBottom: 14 }
            : undefined
        }
      >
        {/* Next Prayer Card with 5-Prayer Timings Bar */}
        <View
          style={[
            styles.prayerCard,
            isTablet && { flex: 1, marginBottom: 0 },
            isForbidden && {
              backgroundColor: isDark ? "#2C0B0E" : "#FEF2F2",
              borderColor: isDark ? "#991B1B" : "#FCA5A5",
              shadowColor: "#EF4444",
              shadowOpacity: 0.12,
            },
          ]}
        >
          {/* Top summary row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Prayer times"
            onPress={() => router.push("/prayer")}
            style={({ pressed }) => [
              styles.prayerTopRow,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.prayerLeft}>
              <View
                style={[
                  styles.mosqueCircle,
                  isForbidden && {
                    backgroundColor: isDark ? "#450A0A" : "#FEE2E2",
                  },
                ]}
              >
                <MosqueIcon
                  size={22}
                  color={isForbidden ? "#DC2626" : "#0F6E56"}
                />
              </View>
              <View style={styles.prayerInfoCol}>
                <View style={styles.prayerHeaderStatusRow}>
                  <Text
                    style={[
                      styles.prayerNextLabel,
                      isForbidden && { color: "#DC2626", fontWeight: "700" },
                    ]}
                  >
                    {isForbidden
                      ? "Prohibited prayer time"
                      : activeWaqt
                        ? "Current waqt"
                        : "Next prayer"}
                  </Text>
                  {isForbidden && processedPrayer?.activeForbidden ? (
                    <View
                      style={[
                        styles.activePillSmall,
                        { backgroundColor: isDark ? "#450A0A" : "#FEE2E2" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.activePillSmallText,
                          { color: "#DC2626" },
                        ]}
                      >
                        {`${processedPrayer.activeForbidden.remainingFormatted} left`}
                      </Text>
                    </View>
                  ) : activeWaqt ? (
                    <View style={styles.activePillSmall}>
                      <Text style={styles.activePillSmallText}>
                        {activeWaqt.remainingFormatted} left
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.prayerCountdown,
                    isForbidden && {
                      color: isDark ? "#F87171" : "#991B1B",
                    },
                  ]}
                >
                  {isForbidden && processedPrayer?.activeForbidden
                    ? `${processedPrayer.activeForbidden.title} ends in ${processedPrayer.activeForbidden.remainingFormatted}`
                    : activeWaqt
                      ? `${activeWaqt.name} ends in ${activeWaqt.remainingFormatted}`
                      : prayer?.nextPrayer
                        ? `${nextPrayerName} in ${displayCountdown}`
                        : (d?.prayerUnavailableReason ??
                          "Schedule unavailable")}
                </Text>
                <View style={styles.prayerSubRow}>
                  <View style={styles.prayerCityRow}>
                    <MapPin
                      size={12}
                      color={isForbidden ? "#DC2626" : "#0F6E56"}
                      strokeWidth={2}
                    />
                    <Text style={styles.prayerCityText} numberOfLines={1}>
                      {prayerCity}
                    </Text>
                  </View>
                  {isForbidden && processedPrayer?.nextPrayer ? (
                    <Text
                      style={[
                        styles.prayerNextNoticeText,
                        { color: isDark ? "#F87171" : "#DC2626" },
                      ]}
                      numberOfLines={1}
                    >
                      {`• Next: ${processedPrayer.nextPrayer.name} in ${processedPrayer.nextPrayer.remainingFormatted}`}
                    </Text>
                  ) : activeWaqt && processedPrayer?.nextPrayer ? (
                    <Text style={styles.prayerNextNoticeText} numberOfLines={1}>
                      {`• Next: ${processedPrayer.nextPrayer.name} in ${processedPrayer.nextPrayer.remainingFormatted}`}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.prayerChevronCircle}>
              <ChevronRight size={16} color="#64748B" strokeWidth={2} />
            </View>
          </Pressable>

          {/* Active Forbidden Interval Warning Banner */}
          {processedPrayer?.activeForbidden ? (
            <View
              style={[
                styles.forbiddenActiveBanner,
                {
                  backgroundColor: isDark ? "#3F1418" : "#FEE2E2",
                  borderColor: isDark ? "#991B1B" : "#F87171",
                },
              ]}
            >
              <AlertCircle size={16} color="#DC2626" strokeWidth={2.4} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.forbiddenBannerTitle,
                    {
                      color: isDark ? "#FECACA" : "#991B1B",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {`Prohibited prayer time: ${processedPrayer.activeForbidden.title}`}
                </Text>
                <Text
                  style={[
                    styles.forbiddenBannerSub,
                    { color: isDark ? "#FCA5A5" : "#B91C1C" },
                  ]}
                >
                  {`Ends in ${processedPrayer.activeForbidden.remainingFormatted} (${processedPrayer.activeForbidden.range}) · Voluntary prayers are prohibited`}
                </Text>
              </View>
            </View>
          ) : null}

          {/* 5-Prayer timings schedule bar with ranges */}
          {processedPrayer && processedPrayer.waqts.length > 0 ? (
            <View
              style={[
                styles.timingsRow,
                isForbidden && {
                  borderTopColor: isDark ? "#7F1D1D" : "#FECACA",
                },
              ]}
            >
              {processedPrayer.waqts.map((p) => (
                <View
                  key={p.name}
                  style={[
                    styles.timingCol,
                    p.isActive && styles.timingColActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timingName,
                      p.isActive
                        ? styles.timingActiveColor
                        : p.isNext
                          ? styles.timingNextColor
                          : null,
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={[
                      styles.timingTime,
                      p.isActive ? styles.timingActiveColor : null,
                    ]}
                  >
                    {p.startTime}
                  </Text>
                  <Text
                    style={[
                      styles.timingRangeEnd,
                      p.isActive && styles.timingRangeEndActive,
                    ]}
                  >
                    {`to ${p.endTime}`}
                  </Text>
                  {p.isActive ? (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>
                        {p.remainingFormatted}
                      </Text>
                    </View>
                  ) : p.isNext ? (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>Next</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : prayerSchedule.length > 0 ? (
            <View
              style={[
                styles.timingsRow,
                isForbidden && {
                  borderTopColor: isDark ? "#7F1D1D" : "#FECACA",
                },
              ]}
            >
              {prayerSchedule.map((p) => (
                <View key={p.name} style={styles.timingCol}>
                  <Text
                    style={[
                      styles.timingName,
                      p.isNext ? styles.timingActiveColor : null,
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={[
                      styles.timingTime,
                      p.isNext ? styles.timingActiveColor : null,
                    ]}
                  >
                    {p.time}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* 3 Forbidden Times in Islam Sub-Card */}
          {processedPrayer && processedPrayer.forbiddenIntervals.length > 0 ? (
            <View
              style={[
                styles.forbiddenSection,
                isForbidden && {
                  borderTopColor: isDark ? "#7F1D1D" : "#FECACA",
                },
              ]}
            >
              <View style={styles.forbiddenHeaderRow}>
                <Text
                  style={[
                    styles.forbiddenSectionTitle,
                    isForbidden && {
                      color: isDark ? "#FECACA" : "#991B1B",
                      fontWeight: "700",
                    },
                  ]}
                >
                  3 Forbidden Times in Islam
                </Text>
                <Text
                  style={[
                    styles.forbiddenSectionBadge,
                    isForbidden && {
                      backgroundColor: isDark ? "#450A0A" : "#FEE2E2",
                      color: "#DC2626",
                    },
                  ]}
                >
                  Makruh / Prohibited
                </Text>
              </View>
              <View style={styles.forbiddenListRow}>
                {processedPrayer.forbiddenIntervals.map((f) => (
                  <View
                    key={f.name}
                    style={[
                      styles.forbiddenItemCol,
                      f.isActive && [
                        styles.forbiddenItemColActive,
                        isForbidden && {
                          backgroundColor: isDark ? "#450A0A" : "#FEE2E2",
                          borderColor: "#DC2626",
                        },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.forbiddenItemName,
                        f.isActive && styles.forbiddenItemNameActive,
                        f.isActive && isForbidden && { color: "#DC2626" },
                      ]}
                    >
                      {f.name}
                    </Text>
                    <Text
                      style={[
                        styles.forbiddenItemRange,
                        f.isActive && styles.forbiddenItemRangeActive,
                        f.isActive && isForbidden && { color: "#991B1B" },
                      ]}
                    >
                      {f.range}
                    </Text>
                    {f.isActive ? (
                      <Text style={styles.forbiddenActiveTag}>
                        {`Active (${f.remainingFormatted})`}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
              <Text
                style={[
                  styles.forbiddenNote,
                  isForbidden && {
                    color: isDark ? "#F87171" : "#B91C1C",
                  },
                ]}
              >
                Voluntary prayers prohibited during sunrise, zenith & sunset
              </Text>
            </View>
          ) : null}
        </View>

        {/* 4. Zakat Summary Card */}
        <ZakatSummaryCard zakat={d?.zakat} isTablet={isTablet} />
      </View>

      {/* 4.5. Recorded Assets Card Component */}
      <View
        style={[
          styles.assetOverviewCard,
          {
            backgroundColor: isDark ? colors.surface : "#FFFFFF",
            borderColor: isDark ? colors.border : "#E2E8F0",
          },
        ]}
      >
        {/* Header row */}
        <View style={styles.assetHeaderRow}>
          <View style={styles.assetLeftCol}>
            <View
              style={[
                styles.assetIconCircle,
                { backgroundColor: isDark ? "#172E24" : "#EBF5F0" },
              ]}
            >
              <Wallet size={20} color="#0F6E56" strokeWidth={2.2} />
            </View>
            <View>
              <Text
                style={[
                  styles.assetCardTitle,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                Recorded assets
              </Text>
              <Text
                style={[
                  styles.assetCardSubtitle,
                  {
                    color: isDark ? "#94A3B8" : "#64748B",
                    fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                  },
                ]}
              >
                {userAssets.length > 0
                  ? `${userAssets.length} holdings recorded`
                  : "No holdings recorded"}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View all assets"
            onPress={() => router.push("/assets")}
            style={({ pressed }) => [
              styles.assetViewAllBtn,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text
              style={[
                styles.assetViewAllText,
                { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
              ]}
            >
              View all
            </Text>
            <ChevronRight size={14} color="#0F6E56" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Amount Row with Illustration */}
        <View style={styles.assetAmountRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.assetTotalAmountText,
                {
                  color: isDark ? "#E1F5EE" : "#111827",
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {formattedAssetsTotal}
            </Text>
            <Text
              style={[
                styles.assetLastUpdatedText,
                {
                  color: isDark ? "#94A3B8" : "#64748B",
                  fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                },
              ]}
            >
              {userAssets[0]?.valuedOn
                ? `Last updated: ${userAssets[0].valuedOn}`
                : "No assets recorded"}
            </Text>
          </View>

          <CoinsPlantIllustration width={64} height={64} />
        </View>

        {/* Asset category chip breakdown */}
        {userAssets.length > 0 ? (
          <View style={styles.assetChipsRow}>
            {userAssets.slice(0, 4).map((a) => (
              <View
                key={a.id}
                style={[
                  styles.assetChip,
                  { backgroundColor: isDark ? "#172E24" : "#EBF5F0" },
                ]}
              >
                <Text
                  style={[
                    styles.assetChipLabel,
                    {
                      color: "#0F6E56",
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {a.label || a.type}{" "}
                  {formatCurrency(
                    a.valuationMode === "METAL_RATE" &&
                      (a.type === "GOLD" ? goldRate : silverRate) &&
                      a.weightGrams &&
                      a.purity
                      ? metalPreview(
                          a.weightGrams,
                          "g",
                          a.purity,
                          (a.type === "GOLD" ? goldRate : silverRate) ?? null,
                        )
                      : a.declaredValue,
                    currency,
                  )}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Quick Add Asset shortcut */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add new asset"
          onPress={() => router.push("/assets/new")}
          style={({ pressed }) => [
            styles.assetAddPill,
            {
              backgroundColor: isDark ? "#172E24" : "#F0FDF4",
              borderColor: isDark ? "#284A3B" : "#A7F3D0",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Plus
            size={16}
            color="#0F6E56"
            strokeWidth={2.2}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.assetAddPillText,
              { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
            ]}
          >
            Add asset
          </Text>
        </Pressable>
      </View>

      {/* 5. Monthly Income & Expenses Metrics */}
      <View style={styles.twoColumnGrid}>
        {/* Income Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Income"
          onPress={() => router.push("/finance")}
          style={({ pressed }) => [
            styles.metricCard,
            { opacity: pressed ? 0.95 : 1 },
          ]}
        >
          <View style={styles.metricHeaderRow}>
            <View
              style={[styles.metricIconCircle, { backgroundColor: "#EBF5FF" }]}
            >
              <CircleArrowUp size={22} color="#2563EB" strokeWidth={1.9} />
            </View>
            <View style={styles.metricLabelCol}>
              <Text style={styles.metricTitle}>Income</Text>
              <Text style={styles.metricSub}>This month</Text>
            </View>
          </View>
          <Text style={styles.metricAmount}>{incomeFormatted}</Text>
        </Pressable>

        {/* Expenses Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Expenses"
          onPress={() => router.push("/finance")}
          style={({ pressed }) => [
            styles.metricCard,
            { opacity: pressed ? 0.95 : 1 },
          ]}
        >
          <View style={styles.metricHeaderRow}>
            <View
              style={[styles.metricIconCircle, { backgroundColor: "#FEECEC" }]}
            >
              <CircleArrowDown size={22} color="#EF4444" strokeWidth={1.9} />
            </View>
            <View style={styles.metricLabelCol}>
              <Text style={styles.metricTitle}>Expenses</Text>
              <Text style={styles.metricSub}>This month</Text>
            </View>
          </View>
          <Text style={styles.metricAmount}>{expensesFormatted}</Text>
        </Pressable>
      </View>

      {/* 5b. Net Income / Net Loss (Monthly Zakat Savings Flow) */}
      <View
        style={[
          styles.netCashFlowCard,
          isDark && {
            backgroundColor: "#162822",
            borderColor: "#26483B",
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isNetIncome ? "Net income" : "Net loss"}
          onPress={() => router.push("/finance")}
          style={({ pressed }) => [
            styles.netCashFlowTopRow,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              flex: 1,
            }}
          >
            <View
              style={[
                styles.netCashFlowIconCircle,
                {
                  backgroundColor: isNetIncome
                    ? isDark
                      ? "#173B2E"
                      : "#DCF5EC"
                    : isDark
                      ? "#3D1E22"
                      : "#FEECEC",
                },
              ]}
            >
              {isNetIncome ? (
                <TrendingUp
                  size={19}
                  color={isDark ? "#5EEAD4" : "#0F6E56"}
                  strokeWidth={2.2}
                />
              ) : (
                <TrendingDown size={19} color="#EF4444" strokeWidth={2.2} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text
                  style={[
                    styles.netCashFlowTitle,
                    isDark && { color: "#FFFFFF" },
                    {
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {isNetIncome ? "Net income" : "Net loss"}
                </Text>
                <View
                  style={[
                    styles.netCashFlowBadge,
                    {
                      backgroundColor: isNetIncome
                        ? isDark
                          ? "#173B2E"
                          : "#DCF5EC"
                        : isDark
                          ? "#3D1E22"
                          : "#FEECEC",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.netCashFlowBadgeText,
                      {
                        color: isNetIncome
                          ? isDark
                            ? "#5EEAD4"
                            : "#0F6E56"
                          : "#EF4444",
                      },
                    ]}
                  >
                    {isNetIncome ? "SURPLUS" : "DEFICIT"}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.netCashFlowSubtitle,
                  isDark && { color: "#94A3B8" },
                  {
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                {isNetIncome
                  ? "Retained savings this month"
                  : "Living costs exceeded income"}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={[
                styles.netCashFlowAmount,
                {
                  color: isNetIncome
                    ? isDark
                      ? "#5EEAD4"
                      : "#0F6E56"
                    : "#EF4444",
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {`${isNetIncome ? "+" : "−"}${netFormatted}`}
            </Text>
            {savingsRateText ? (
              <Text
                style={[
                  styles.netCashFlowRateText,
                  {
                    color: isNetIncome
                      ? isDark
                        ? "#A7D5C4"
                        : "#0F6E56"
                      : "#EF4444",
                  },
                ]}
              >
                {savingsRateText}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {/* Zakat Insight Note */}
        <View
          style={[
            styles.netCashFlowZakatNote,
            isDark && {
              backgroundColor: "rgba(15, 110, 86, 0.12)",
              borderTopColor: "#26483B",
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text
              style={[
                styles.netCashFlowZakatText,
                isDark && { color: "#C8E4D7" },
                {
                  fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                },
              ]}
            >
              {isNetIncome
                ? potentialZakatFormatted
                  ? `Zakat impact: ~${potentialZakatFormatted} (2.5%) if surplus is held for 1 lunar year (hawl)`
                  : "Zakat impact: Retained savings contribute to zakat-eligible wealth above nisab"
                : "Zakat impact: Monthly deficit reduces liquid reserves; no zakat due on losses"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zakat breakdown"
            onPress={() => router.push("/zakat")}
            style={({ pressed }) => [
              styles.netCashFlowZakatLinkPill,
              isDark && { backgroundColor: "#173E2E", borderColor: "#284A3B" },
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text
              style={[
                styles.netCashFlowZakatLinkText,
                isDark && { color: "#5EEAD4" },
              ]}
            >
              Zakat {">"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 6. Quick Action Buttons Row */}
      <View style={styles.twoColumnGrid}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add expense"
          onPress={() => router.push("/transactions/new?type=EXPENSE")}
          style={({ pressed }) => [
            styles.primaryActionBtn,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.primaryActionText}>Add expense</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add income"
          onPress={() => router.push("/transactions/new?type=INCOME")}
          style={({ pressed }) => [
            styles.secondaryActionBtn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Plus size={18} color="#0F6E56" strokeWidth={2.2} />
          <Text style={styles.secondaryActionText}>Add income</Text>
        </Pressable>
      </View>

      {/* 7. Recent Transactions List */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeaderRow}>
          <Text style={styles.recentTitle}>Recent transactions</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View all transactions"
            onPress={() => router.push("/transactions")}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>View all</Text>
            <ChevronRight size={14} color="#64748B" strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.transactionsCard}>
          {recentList.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ color: "#64748B", fontSize: 14 }}>
                No recent transactions.
              </Text>
            </View>
          ) : (
            recentList.map((tx, idx) => (
              <Pressable
                key={tx.id || idx}
                accessibilityRole="button"
                onPress={() => router.push(`/transactions/${tx.id}` as any)}
                style={[
                  styles.txItemRow,
                  idx < recentList.length - 1 ? styles.txDivider : null,
                ]}
              >
                <View style={styles.txLeft}>
                  <View
                    style={[styles.txIconCircle, { backgroundColor: tx.bg }]}
                  >
                    <tx.Icon size={18} color={tx.color} strokeWidth={1.8} />
                  </View>
                  <View style={styles.txTextCol}>
                    <Text style={styles.txCategoryName}>{tx.category}</Text>
                    <Text style={styles.txSub}>{tx.subtitle}</Text>
                  </View>
                </View>
                <Text style={[styles.txAmountText, { color: tx.color }]}>
                  {tx.amount}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </View>

      {/* 8. Quick Links (Quran & Dua) */}
      <View style={styles.twoColumnGrid}>
        {/* Quran Link */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quran"
          onPress={() => router.push("/quran")}
          style={({ pressed }) => [
            styles.quickLinkCard,
            { opacity: pressed ? 0.95 : 1 },
          ]}
        >
          <View style={styles.quickLinkLeft}>
            <View style={styles.quickLinkIconCircle}>
              <BookOpen size={19} color="#0F6E56" strokeWidth={1.8} />
            </View>
            <View style={styles.quickLinkTextCol}>
              <Text style={styles.quickLinkTitle}>Quran</Text>
              <Text style={styles.quickLinkSub}>Read and reflect</Text>
            </View>
          </View>
          <ChevronRight size={17} color="#94A3B8" strokeWidth={1.8} />
        </Pressable>

        {/* Dua Link */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dua"
          onPress={() => router.push("/dua")}
          style={({ pressed }) => [
            styles.quickLinkCard,
            { opacity: pressed ? 0.95 : 1 },
          ]}
        >
          <View style={styles.quickLinkLeft}>
            <View style={styles.quickLinkIconCircle}>
              <DuaHandsIcon size={19} color="#0F6E56" />
            </View>
            <View style={styles.quickLinkTextCol}>
              <Text style={styles.quickLinkTitle}>Dua</Text>
              <Text style={styles.quickLinkSub}>Authentic duas</Text>
            </View>
          </View>
          <ChevronRight size={17} color="#94A3B8" strokeWidth={1.8} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    marginBottom: 12,
  },
  avatarGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E1F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTextCol: {
    gap: 1,
  },
  greetingSubtext: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    color: "#64748B",
  },
  userNameText: {
    fontFamily: "OutfitMedium",
    fontSize: 17,
    color: "#182322",
  },
  bellCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  heroSection: {
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 34,
    lineHeight: 40,
    color: "#111827",
    letterSpacing: -0.5,
  },
  prayerCard: {
    backgroundColor: "#EBF6F1",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D8ECE2",
    marginBottom: 14,
  },
  prayerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prayerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  mosqueCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D6F2E4",
    alignItems: "center",
    justifyContent: "center",
  },
  prayerInfoCol: {
    gap: 2,
    flex: 1,
  },
  prayerHeaderStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activePillSmall: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  activePillSmallText: {
    fontFamily: "OutfitMedium",
    fontSize: 11,
    color: "#15803D",
  },
  prayerNextLabel: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#0F6E56",
  },
  prayerCountdown: {
    fontFamily: "OutfitMedium",
    fontSize: 16,
    color: "#111827",
  },
  prayerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
    flexWrap: "wrap",
  },
  prayerCityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  prayerCityText: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    color: "#5B6F68",
  },
  prayerNextNoticeText: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#0F6E56",
  },
  prayerChevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  forbiddenActiveBanner: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  forbiddenBannerTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 13,
    color: "#92400E",
  },
  forbiddenBannerSub: {
    fontFamily: "Outfit",
    fontSize: 11.5,
    color: "#B45309",
    marginTop: 1,
  },
  timingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#DCEFE6",
    gap: 4,
  },
  timingCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timingColActive: {
    backgroundColor: "#D6F2E4",
  },
  timingName: {
    fontFamily: "Outfit",
    fontSize: 11.5,
    color: "#64748B",
  },
  timingTime: {
    fontFamily: "OutfitMedium",
    fontSize: 13,
    color: "#182322",
  },
  timingRangeEnd: {
    fontFamily: "Outfit",
    fontSize: 10.5,
    color: "#94A3B8",
  },
  timingRangeEndActive: {
    color: "#0F6E56",
    fontWeight: "600",
  },
  timingActiveColor: {
    color: "#0F6E56",
    fontWeight: "600",
  },
  timingNextColor: {
    color: "#0284C7",
    fontWeight: "600",
  },
  activeBadge: {
    backgroundColor: "#0F6E56",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  activeBadgeText: {
    fontFamily: "OutfitMedium",
    fontSize: 9,
    color: "#FFFFFF",
  },
  nextBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  nextBadgeText: {
    fontFamily: "OutfitMedium",
    fontSize: 9,
    color: "#0284C7",
  },
  forbiddenSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#DCEFE6",
  },
  forbiddenHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  forbiddenSectionTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 12,
    color: "#2D3748",
  },
  forbiddenSectionBadge: {
    fontFamily: "Outfit",
    fontSize: 10,
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  forbiddenListRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  forbiddenItemCol: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  forbiddenItemColActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  forbiddenItemName: {
    fontFamily: "OutfitMedium",
    fontSize: 11,
    color: "#475569",
  },
  forbiddenItemNameActive: {
    color: "#92400E",
    fontWeight: "700",
  },
  forbiddenItemRange: {
    fontFamily: "Outfit",
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  forbiddenItemRangeActive: {
    color: "#92400E",
    fontWeight: "600",
  },
  forbiddenActiveTag: {
    fontFamily: "OutfitMedium",
    fontSize: 9,
    color: "#DC2626",
    marginTop: 2,
  },
  forbiddenNote: {
    fontFamily: "Outfit",
    fontSize: 10.5,
    color: "#718096",
    marginTop: 6,
    textAlign: "center",
  },
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
  },
  zakatDueAmount: {
    fontFamily: "OutfitMedium",
    fontSize: 26,
    color: "#0A3828",
  },
  zakatDueLabel: {
    fontFamily: "OutfitMedium",
    fontSize: 18,
    color: "#0F6E56",
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
  wealthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
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
    marginHorizontal: 10,
  },
  nisabStatusValue: {
    fontFamily: "OutfitMedium",
    color: "#0F6E56",
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2EDE6",
    marginTop: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#0F6E56",
    width: "48%",
  },
  anniversaryText: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    color: "#5A6F68",
  },
  anniversaryDays: {
    fontFamily: "OutfitMedium",
    color: "#0F6E56",
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDF2EE",
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  metricHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metricIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabelCol: {
    gap: 1,
  },
  metricTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 13.5,
    color: "#182322",
  },
  metricSub: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  metricAmount: {
    fontFamily: "OutfitMedium",
    fontSize: 22,
    color: "#111827",
    marginTop: 10,
  },
  primaryActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0F6E56",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#0F6E56",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryActionText: {
    fontFamily: "OutfitMedium",
    fontSize: 14.5,
    color: "#FFFFFF",
  },
  secondaryActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#0F6E56",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryActionText: {
    fontFamily: "OutfitMedium",
    fontSize: 14.5,
    color: "#0F6E56",
  },
  recentSection: {
    marginBottom: 14,
  },
  recentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  recentTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 17,
    color: "#111827",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    fontFamily: "Outfit",
    fontSize: 13,
    color: "#64748B",
  },
  transactionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EDF2EE",
  },
  txItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  txDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F3",
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  txIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  txTextCol: {
    gap: 2,
    flex: 1,
  },
  txCategoryName: {
    fontFamily: "OutfitMedium",
    fontSize: 14.5,
    color: "#182322",
  },
  txSub: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  txAmountText: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
  },
  quickLinkCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDF2EE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  quickLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  quickLinkIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E1F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLinkTextCol: {
    gap: 1,
    flex: 1,
  },
  quickLinkTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 14.5,
    color: "#111827",
  },
  quickLinkSub: {
    fontFamily: "Outfit",
    fontSize: 11.5,
    color: "#64748B",
  },
  assetOverviewCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  assetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  assetLeftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  assetIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  assetCardTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 16,
    color: "#182322",
  },
  assetCardSubtitle: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  assetViewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#EBF5F0",
    gap: 2,
  },
  assetViewAllText: {
    fontFamily: "OutfitMedium",
    color: "#0F6E56",
    fontSize: 13,
  },
  assetAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  assetTotalAmountText: {
    fontFamily: "OutfitMedium",
    fontSize: 24,
    color: "#111827",
    marginBottom: 4,
  },
  assetLastUpdatedText: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  assetChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  assetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  assetChipLabel: {
    fontFamily: "OutfitMedium",
    fontSize: 12,
  },
  assetAddPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
  },
  assetAddPillText: {
    fontFamily: "OutfitMedium",
    color: "#0F6E56",
    fontSize: 14,
  },
  netCashFlowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EDF2EE",
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  netCashFlowTopRow: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  netCashFlowIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  netCashFlowTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
    color: "#182322",
  },
  netCashFlowSubtitle: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  netCashFlowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  netCashFlowBadgeText: {
    fontFamily: "OutfitMedium",
    fontSize: 10,
    fontWeight: "700",
  },
  netCashFlowAmount: {
    fontFamily: "OutfitMedium",
    fontSize: 18,
    fontWeight: "700",
  },
  netCashFlowRateText: {
    fontFamily: "Outfit",
    fontSize: 11,
    marginTop: 2,
  },
  netCashFlowZakatNote: {
    backgroundColor: "#F0FDF4",
    borderTopWidth: 1,
    borderTopColor: "#DCFCE7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  netCashFlowZakatText: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#166534",
    lineHeight: 16,
  },
  netCashFlowZakatLinkPill: {
    backgroundColor: "#DCF5EC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  netCashFlowZakatLinkText: {
    fontFamily: "OutfitMedium",
    fontSize: 11,
    color: "#0F6E56",
    fontWeight: "700",
  },
});
