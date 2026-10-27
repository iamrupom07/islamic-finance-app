import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
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
  Wallet,
} from "lucide-react-native";
import { Screen } from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
import { useAccountQuery } from "../../core/api/hooks";
import { api, dataOf } from "../../core/api/client";
import { useAuth } from "../../core/auth/AuthProvider";
import { localDate } from "../../core/i18n/formatters";
import { CoinsPlantIllustration } from "../assets/AssetIcons";

function MosqueIcon({ size = 22, color = "#0F6E56" }: { size?: number; color?: string }) {
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

function DuaHandsIcon({ size = 20, color = "#0F6E56" }: { size?: number; color?: string }) {
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

function SproutWhiteIcon({ size = 22 }: { size?: number }) {
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

function formatCurrency(amount: string | number | null | undefined, currency: string = "BDT") {
  const sym = currency === "BDT" ? "৳" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;
  if (amount == null) return `${sym}0`;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${sym}0`;
  return `${sym}${Math.round(num).toLocaleString()}`;
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
    async () => dataOf(await api.GET("/v1/assets", { params: { query: { limit: 50 } } })),
    true,
  );
  const d = query.data;
  const { account } = useAuth();
  const [countdown, setCountdown] = useState<string>("01:12:18");

  const prayer =
    d?.prayer?.date === localDate(account?.preferences?.timezone ?? "Asia/Dhaka")
      ? d.prayer
      : d?.prayer ?? null;

  // Live countdown to next prayer
  useEffect(() => {
    if (!prayer?.nextPrayer?.at) return;
    const target = new Date(prayer.nextPrayer.at).getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
      setCountdown(`${h}:${m}:${s}`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [prayer?.nextPrayer?.at]);

  // User display name from email or profile
  const rawEmail = account?.user?.email ?? "";
  const nameFromEmail = rawEmail.includes("@")
    ? (rawEmail.split("@")[0] ?? "Amina").replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Amina";
  const userName = nameFromEmail || "Amina";

  // Data helpers
  const currency = d?.monthlyFinance?.currency ?? account?.preferences?.currency ?? "BDT";
  const rawIncome = d?.monthlyFinance?.income;
  const rawExpenses = d?.monthlyFinance?.expenses;
  const incomeFormatted = rawIncome && parseFloat(rawIncome) > 0 ? formatCurrency(rawIncome, currency) : "৳85,000";
  const expensesFormatted = rawExpenses && parseFloat(rawExpenses) > 0 ? formatCurrency(rawExpenses, currency) : "৳32,400";

  // Zakat info
  const hasZakatEstimate = d?.zakat?.estimate && parseFloat(d.zakat.estimate) > 0;
  const zakatDueFormatted = hasZakatEstimate
    ? formatCurrency(d.zakat.estimate, d.zakat.currency)
    : "৳12,450";
  const netWealthFormatted = d?.zakat?.netEligibleWealth && parseFloat(d.zakat.netEligibleWealth) > 0
    ? formatCurrency(d.zakat.netEligibleWealth, d.zakat.currency)
    : "৳498,000";

  // Assets info
  const userAssets = assetsQuery.data?.items ?? [];
  const calculatedTotalAssets =
    userAssets.length > 0
      ? userAssets.reduce(
          (sum, item) => sum + (parseFloat(item.declaredValue ?? "0") || 0),
          0,
        )
      : 660000;
  const formattedAssetsTotal = formatCurrency(calculatedTotalAssets, currency);

  // Prayer display calculations
  const nextPrayerName = prayer?.nextPrayer?.name ?? "Maghrib";
  const prayerCity = prayer?.city ?? "Khulna, Bangladesh";

  const standardPrayers = [
    { name: "Fajr", defaultTime: "4:42" },
    { name: "Dhuhr", defaultTime: "11:58" },
    { name: "Asr", defaultTime: "3:32" },
    { name: "Maghrib", defaultTime: "5:21" },
    { name: "Isha", defaultTime: "6:39" },
  ];

  const prayerSchedule = standardPrayers.map((sp) => {
    const found = prayer?.timings?.find((t) => t.name.toLowerCase() === sp.name.toLowerCase());
    return {
      name: sp.name,
      time: found?.label ? found.label.replace(/^0/, "") : sp.defaultTime,
      isNext: sp.name.toLowerCase() === nextPrayerName.toLowerCase(),
    };
  });

  // Recent transactions
  const defaultRecentTransactions = [
    {
      id: "demo-1",
      category: "Groceries",
      subtitle: "Today • Supermarket",
      amount: "-৳1,250",
      isIncome: false,
      Icon: ShoppingCart,
      color: "#EF4444",
      bg: "#FEECEC",
    },
    {
      id: "demo-2",
      category: "Salary",
      subtitle: "Oct 26 • Monthly salary",
      amount: "+৳45,000",
      isIncome: true,
      Icon: Briefcase,
      color: "#0284C7",
      bg: "#EBF5FF",
    },
    {
      id: "demo-3",
      category: "Sadaqah",
      subtitle: "Oct 25 • For a family in need",
      amount: "-৳500",
      isIncome: false,
      Icon: Heart,
      color: "#EF4444",
      bg: "#E1F5EE",
    },
  ];

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
            category: tx.category.charAt(0).toUpperCase() + tx.category.slice(1).toLowerCase().replace(/_/g, " "),
            subtitle: `${tx.localDate} • ${tx.description ?? (isInc ? "Received" : "Payment")}`,
            amount: (isInc ? "+" : "-") + formatCurrency(tx.amount, tx.currency),
            isIncome: isInc,
            Icon,
            color,
            bg,
          };
        })
      : defaultRecentTransactions;

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
          onPress={() => router.push("/settings/notifications")}
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
        <Text style={styles.heroTitle}>Track your money{"\n"}and know your zakat</Text>
      </View>

      {/* 3 & 4. Next Prayer and Zakat Cards */}
      <View style={isTablet ? { flexDirection: "row", gap: 14, marginBottom: 14 } : undefined}>
        {/* Next Prayer Card with 5-Prayer Timings Bar */}
        <View style={[styles.prayerCard, isTablet && { flex: 1, marginBottom: 0 }]}>
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
            <View style={styles.mosqueCircle}>
              <MosqueIcon size={22} color="#0F6E56" />
            </View>
            <View style={styles.prayerInfoCol}>
              <Text style={styles.prayerNextLabel}>Next prayer</Text>
              <Text style={styles.prayerCountdown}>
                {nextPrayerName} in {countdown}
              </Text>
              <View style={styles.prayerCityRow}>
                <MapPin size={12} color="#0F6E56" strokeWidth={2} />
                <Text style={styles.prayerCityText} numberOfLines={1}>
                  {prayerCity}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.prayerChevronCircle}>
            <ChevronRight size={16} color="#64748B" strokeWidth={2} />
          </View>
        </Pressable>

        {/* 5-Prayer timings schedule bar */}
        <View style={styles.timingsRow}>
          {prayerSchedule.map((p) => (
            <View key={p.name} style={styles.timingCol}>
              <Text style={[styles.timingName, p.isNext ? styles.timingActiveColor : null]}>
                {p.name}
              </Text>
              <Text style={[styles.timingTime, p.isNext ? styles.timingActiveColor : null]}>
                {p.time}
              </Text>
            </View>
          ))}
        </View>
      </View>

        {/* 4. Zakat Summary Card */}
        <View style={[styles.zakatCard, isTablet && { flex: 1, marginBottom: 0 }]}>
        {/* Top row */}
        <View style={styles.zakatTopRow}>
          <View style={styles.sproutBadge}>
            <SproutWhiteIcon size={24} />
          </View>

          <View style={styles.zakatAmountCol}>
            <Text style={styles.zakatLabel}>Zakat summary</Text>
            {d?.zakat?.status && !hasZakatEstimate ? (
              <View style={styles.zakatStatusBadge}>
                <Text style={styles.zakatStatusText}>
                  {d.zakat.status.replace(/_/g, " ")}
                </Text>
              </View>
            ) : (
              <View style={styles.zakatDueRow}>
                <Text style={styles.zakatDueAmount}>{zakatDueFormatted}</Text>
                <Text style={styles.zakatDueLabel}>due</Text>
              </View>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View breakdown"
            onPress={() => router.push("/zakat")}
            style={({ pressed }) => [
              styles.viewBreakdownPill,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text style={styles.viewBreakdownText}>View breakdown</Text>
            <ChevronRight size={14} color="#182322" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Wealth & Nisab stats row */}
        <View style={styles.wealthRow}>
          <Text style={styles.wealthLabel}>
            Net wealth  <Text style={styles.wealthValue}>{netWealthFormatted}</Text>
          </Text>
          <View style={styles.wealthDivider} />
          <Text style={styles.wealthLabel}>
            Nisab status: <Text style={styles.nisabStatusValue}>above threshold</Text>
          </Text>
        </View>

        {/* Anniversary progress bar */}
        <View style={styles.progressBarTrack}>
          <View style={styles.progressBarFill} />
        </View>

        {/* Anniversary countdown text */}
        <Text style={styles.anniversaryText}>
          <Text style={styles.anniversaryDays}>112 days</Text> until zakat anniversary
        </Text>
      </View>
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
                {userAssets.length > 0 ? `${userAssets.length} holdings recorded` : "5 holdings recorded"}
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
              Last updated: 26 Oct 2026, 09:10 AM
            </Text>
          </View>

          <CoinsPlantIllustration width={64} height={64} />
        </View>

        {/* Asset category chip breakdown */}
        <View style={styles.assetChipsRow}>
          <View style={[styles.assetChip, { backgroundColor: isDark ? "#172E24" : "#EBF5F0" }]}>
            <Text
              style={[
                styles.assetChipLabel,
                {
                  color: "#0F6E56",
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              Cash ৳120k
            </Text>
          </View>
          <View style={[styles.assetChip, { backgroundColor: isDark ? "#1E2A4A" : "#EBF5FF" }]}>
            <Text
              style={[
                styles.assetChipLabel,
                {
                  color: "#2563EB",
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              Savings ৳180k
            </Text>
          </View>
          <View style={[styles.assetChip, { backgroundColor: isDark ? "#2D2619" : "#FEF3C7" }]}>
            <Text
              style={[
                styles.assetChipLabel,
                {
                  color: "#D97706",
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              Gold ৳240k
            </Text>
          </View>
          <View style={[styles.assetChip, { backgroundColor: isDark ? "#281E38" : "#F3E8FF" }]}>
            <Text
              style={[
                styles.assetChipLabel,
                {
                  color: "#7C3AED",
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              Invest ৳80k
            </Text>
          </View>
        </View>

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
          <Plus size={16} color="#0F6E56" strokeWidth={2.2} style={{ marginRight: 6 }} />
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
            <View style={[styles.metricIconCircle, { backgroundColor: "#EBF5FF" }]}>
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
            <View style={[styles.metricIconCircle, { backgroundColor: "#FEECEC" }]}>
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
          {recentList.map((tx, idx) => (
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
                <View style={[styles.txIconCircle, { backgroundColor: tx.bg }]}>
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
          ))}
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
  prayerCityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  prayerCityText: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    color: "#5B6F68",
  },
  prayerChevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  timingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#DCEFE6",
  },
  timingCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  timingName: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  timingTime: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#182322",
  },
  timingActiveColor: {
    color: "#0F6E56",
    fontWeight: "600",
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
});
