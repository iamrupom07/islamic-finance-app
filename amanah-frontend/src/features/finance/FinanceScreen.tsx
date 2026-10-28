import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Utensils,
  Receipt,
  Bus,
  MoreHorizontal,
  Sprout,
  TrendingUp,
  TrendingDown,
  Plus,
  Scale,
} from "lucide-react-native";
import { Screen } from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
import { useAuth } from "../../core/auth/AuthProvider";
import { monthNow } from "../../core/i18n/formatters";
import { api, dataOf } from "../../core/api/client";
import { useAccountQuery } from "../../core/api/hooks";
import { percent, shiftMonth } from "./value-tools";

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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatMonthLabel(monthStr: string) {
  const parts = monthStr.split("-");
  if (parts.length === 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1]!, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTH_NAMES[monthIndex]} ${year}`;
    }
  }
  return "October 2026";
}

/**
 * 6-Month Income vs Expenses Bar Chart SVG
 */
function IncomeVsExpensesChart({ isDark = false }: { isDark?: boolean }) {
  const chartData = [
    { month: "May", income: 50, expenses: 25 },
    { month: "Jun", income: 64, expenses: 28 },
    { month: "Jul", income: 56, expenses: 25 },
    { month: "Aug", income: 75, expenses: 36 },
    { month: "Sep", income: 71, expenses: 30 },
    { month: "Oct", income: 78, expenses: 32 },
  ];

  const colWidth = 44;
  const startX = 60;
  const barWidth = 11;
  const zeroY = 145;
  const maxHeight = 120; // 100K = 120px, so 1K = 1.2px

  const gridLineColor = isDark ? "#334155" : "#E2E8F0";
  const axisTextColor = isDark ? "#94A3B8" : "#94A3B8";
  const monthTextColor = isDark ? "#CBD5E1" : "#64748B";

  return (
    <View style={styles.chartWrapper}>
      <Svg
        width="100%"
        height={175}
        viewBox="0 0 320 175"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal Dotted Gridlines & Y-Axis Labels */}
        {/* 100K */}
        <SvgText
          x="30"
          y="28"
          fill={axisTextColor}
          fontSize="10.5"
          fontFamily="Outfit"
          textAnchor="end"
        >
          100K
        </SvgText>
        <Path
          d="M 36 25 H 312"
          stroke={gridLineColor}
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* 75K */}
        <SvgText
          x="30"
          y="58"
          fill={axisTextColor}
          fontSize="10.5"
          fontFamily="Outfit"
          textAnchor="end"
        >
          75K
        </SvgText>
        <Path
          d="M 36 55 H 312"
          stroke={gridLineColor}
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* 50K */}
        <SvgText
          x="30"
          y="88"
          fill={axisTextColor}
          fontSize="10.5"
          fontFamily="Outfit"
          textAnchor="end"
        >
          50K
        </SvgText>
        <Path
          d="M 36 85 H 312"
          stroke={gridLineColor}
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* 25K */}
        <SvgText
          x="30"
          y="118"
          fill={axisTextColor}
          fontSize="10.5"
          fontFamily="Outfit"
          textAnchor="end"
        >
          25K
        </SvgText>
        <Path
          d="M 36 115 H 312"
          stroke={gridLineColor}
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* 0 (Base Line) */}
        <SvgText
          x="30"
          y="148"
          fill={axisTextColor}
          fontSize="10.5"
          fontFamily="Outfit"
          textAnchor="end"
        >
          0
        </SvgText>
        <Path
          d="M 36 145 H 312"
          stroke={gridLineColor}
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* Grouped Month Bars */}
        {chartData.map((item, idx) => {
          const colX = startX + idx * colWidth;
          const incHeight = (item.income / 100) * maxHeight;
          const expHeight = (item.expenses / 100) * maxHeight;
          const incY = zeroY - incHeight;
          const expY = zeroY - expHeight;

          return (
            <React.Fragment key={item.month}>
              {/* Blue Income Bar */}
              <Rect
                x={colX - barWidth - 1}
                y={incY}
                width={barWidth}
                height={incHeight}
                rx={3}
                fill="#3B82F6"
              />
              {/* Red Expense Bar */}
              <Rect
                x={colX + 2}
                y={expY}
                width={barWidth}
                height={expHeight}
                rx={3}
                fill="#EF4444"
              />
              {/* Month Label */}
              <SvgText
                x={colX}
                y={162}
                fill={monthTextColor}
                fontSize="11"
                fontFamily="Outfit"
                textAnchor="middle"
              >
                {item.month}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

export function FinanceScreen() {
  const { account } = useAuth();
  const router = useRouter();
  const { colors, dark: isDark, locale } = useTheme();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isSmallScreen = width < 420;
  const isNarrowScreen = width < 600;

  const [month, setMonth] = useState(
    monthNow(account?.preferences?.timezone ?? "Asia/Dhaka") || "2026-10",
  );

  const q = useAccountQuery(
    ["report", month],
    async () =>
      dataOf(
        await api.GET("/v1/finance/report", { params: { query: { month } } }),
      ),
    true,
  );
  const d = q.data;

  const rep = (d as any)?.report ?? d;
  const currency = rep?.currency ?? account?.preferences?.currency ?? "BDT";

  const incomeDisplay = formatCurrency(rep?.income ?? "0", currency);
  const expensesDisplay = formatCurrency(rep?.expenses ?? "0", currency);
  const sadaqahDisplay = formatCurrency(rep?.sadaqah ?? "0", currency);

  const incomeNum = parseFloat(rep?.income ?? "0") || 0;
  const expensesNum = parseFloat(rep?.expenses ?? "0") || 0;
  const netAmount = incomeNum - expensesNum;
  const isNetIncome = netAmount >= 0;
  const absNet = Math.abs(netAmount);
  const netDisplay = formatCurrency(absNet.toFixed(2), currency);
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
  const potentialZakatDisplay =
    isNetIncome && absNet > 0
      ? formatCurrency((absNet * 0.025).toFixed(2), currency)
      : null;
  const lifetimeDisplay = formatCurrency(
    (d as any)?.lifetimeSadaqah ?? rep?.sadaqah ?? "0",
    currency,
  );

  const defaultCategories = [
    {
      name: "Food",
      color: "#0F6E56",
      badgeBg: isDark ? "#173E2E" : "#DCF5EC",
      Icon: Utensils,
    },
    {
      name: "Bills",
      color: "#3B82F6",
      badgeBg: isDark ? "#1E2E4E" : "#EBF5FF",
      Icon: Receipt,
    },
    {
      name: "Transport",
      color: "#F59E0B",
      badgeBg: isDark ? "#3E3015" : "#FEF3C7",
      Icon: Bus,
    },
    {
      name: "Other",
      color: "#8B5CF6",
      badgeBg: isDark ? "#2C1E4A" : "#F3E8FF",
      Icon: MoreHorizontal,
    },
  ];

  const rawCategories = rep?.categories ?? [];
  const categoriesToRender = rawCategories.map((c: any, i: number) => {
    const fallback = defaultCategories[i % defaultCategories.length]!;
    return {
      name:
        c.category.charAt(0).toUpperCase() +
        c.category.slice(1).toLowerCase().replace(/_/g, " "),
      amount: formatCurrency(c.amount, currency),
      percentage: percent(c.amount, rep?.expenses || "1"),
      color: fallback.color,
      badgeBg: fallback.badgeBg,
      Icon: fallback.Icon,
    };
  });

  return (
    <Screen
      tabs
      maxWidth={isDesktop ? 960 : isTablet ? 820 : 680}
      refresh={() => {
        void q.refetch();
      }}
      busy={q.isRefetching}
    >
      {/* 1. Header Bar with Month Filter & Sliders Action */}
      <View style={styles.topHeaderBar}>
        <View style={styles.titleColumn}>
          <Text
            style={[
              styles.screenTitle,
              {
                color: colors.ink,
                fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
              },
            ]}
          >
            Finance
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select month"
            onPress={() => {
              setMonth((prev) => shiftMonth(prev, -1));
            }}
            style={({ pressed }) => [
              styles.monthFilterPill,
              {
                backgroundColor: isDark ? colors.surface : "#F1F5F3",
                borderColor: isDark ? colors.border : "#E2EAE5",
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.monthFilterText,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {formatMonthLabel(month)}
            </Text>
            <ChevronDown
              size={14}
              color={isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter"
          onPress={() => router.push("/transactions")}
          style={({ pressed }) => [
            styles.filterCircleButton,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#E5E8EB",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <SlidersHorizontal size={19} color={colors.ink} strokeWidth={1.9} />
        </Pressable>
      </View>

      {/* 2. Hero Headline with Two-Tone Style */}
      <View style={styles.heroSection}>
        <Text
          style={[
            styles.heroHeadlineDark,
            {
              color: colors.ink,
              fontSize: isSmallScreen ? 28 : isTablet ? 40 : 34,
              lineHeight: isSmallScreen ? 34 : isTablet ? 46 : 40,
              fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
            },
          ]}
        >
          See where your
        </Text>
        <Text
          style={[
            styles.heroHeadlineMuted,
            {
              color: isDark ? "#94A3B8" : "#64748B",
              fontSize: isSmallScreen ? 28 : isTablet ? 40 : 34,
              lineHeight: isSmallScreen ? 34 : isTablet ? 46 : 40,
              fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
            },
          ]}
        >
          money goes.
        </Text>
      </View>

      {/* 3. Monthly Metrics Row (Income & Expenses) */}
      <View style={[styles.twoColumnGrid, isSmallScreen && { gap: 8 }]}>
        {/* Income Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Income"
          onPress={() =>
            router.push(`/transactions?month=${month}&type=INCOME` as any)
          }
          style={({ pressed }) => [
            styles.metricCard,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#EDF2EE",
              padding: isSmallScreen ? 12 : 16,
              gap: isSmallScreen ? 8 : 12,
              opacity: pressed ? 0.95 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.metricIconCircle,
              isSmallScreen && { width: 38, height: 38, borderRadius: 19 },
              { backgroundColor: isDark ? "#172E3B" : "#EBF5FF" },
            ]}
          >
            <Svg
              width={isSmallScreen ? 16 : 18}
              height={isSmallScreen ? 16 : 18}
              viewBox="0 0 24 24"
              fill="none"
            >
              <Path
                d="M7 17L17 7M17 7H9M17 7V15"
                stroke="#0284C7"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View style={styles.metricTextCol}>
            <Text
              style={[
                styles.metricLabel,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Income
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.metricValue,
                {
                  color: colors.ink,
                  fontSize: isSmallScreen ? 17 : 20,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {incomeDisplay}
            </Text>
          </View>
        </Pressable>

        {/* Expenses Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Expenses"
          onPress={() =>
            router.push(`/transactions?month=${month}&type=EXPENSE` as any)
          }
          style={({ pressed }) => [
            styles.metricCard,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#EDF2EE",
              padding: isSmallScreen ? 12 : 16,
              gap: isSmallScreen ? 8 : 12,
              opacity: pressed ? 0.95 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.metricIconCircle,
              isSmallScreen && { width: 38, height: 38, borderRadius: 19 },
              { backgroundColor: isDark ? "#3A1B1E" : "#FEECEC" },
            ]}
          >
            <Svg
              width={isSmallScreen ? 16 : 18}
              height={isSmallScreen ? 16 : 18}
              viewBox="0 0 24 24"
              fill="none"
            >
              <Path
                d="M7 7L17 17M17 17V9M17 17H9"
                stroke="#EF4444"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View style={styles.metricTextCol}>
            <Text
              style={[
                styles.metricLabel,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Expenses
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.metricValue,
                {
                  color: colors.ink,
                  fontSize: isSmallScreen ? 17 : 20,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {expensesDisplay}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* 3b. Net Income / Net Loss & Zakat Flow Card */}
      <View
        style={[
          styles.netFinanceCard,
          {
            backgroundColor: isDark ? colors.surface : "#FFFFFF",
            borderColor: isDark ? colors.border : "#EDF2EE",
          },
        ]}
      >
        <View style={styles.netFinanceTopRow}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              flex: 1,
            }}
          >
            <View
              style={[
                styles.netFinanceIconCircle,
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
                  size={22}
                  color={isDark ? "#5EEAD4" : "#0F6E56"}
                  strokeWidth={2.4}
                />
              ) : (
                <TrendingDown size={22} color="#EF4444" strokeWidth={2.4} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Text
                  style={[
                    styles.netFinanceTitle,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {isNetIncome ? "Net income" : "Net loss"}
                </Text>
                <View
                  style={[
                    styles.netFinanceBadge,
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
                      styles.netFinanceBadgeText,
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
                  styles.netFinanceSubtitle,
                  {
                    color: isDark ? "#94A3B8" : "#64748B",
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

          <View style={{ alignItems: "flex-end", paddingLeft: 8 }}>
            <Text
              style={[
                styles.netFinanceAmount,
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
              {`${isNetIncome ? "+" : "−"}${netDisplay}`}
            </Text>
            {savingsRateText ? (
              <View
                style={[
                  styles.netFinanceRateBadge,
                  {
                    backgroundColor: isNetIncome
                      ? isDark
                        ? "#15382A"
                        : "#E6F6F0"
                      : isDark
                        ? "#3B1B1E"
                        : "#FEECEC",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.netFinanceRateText,
                    {
                      color: isNetIncome
                        ? isDark
                          ? "#5EEAD4"
                          : "#0F6E56"
                        : "#EF4444",
                    },
                  ]}
                >
                  {savingsRateText}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Zakat Explanation & Impact Note */}
        <View
          style={[
            styles.netFinanceZakatBox,
            {
              backgroundColor: isDark ? "#132E23" : "#F4FBF7",
              borderTopColor: isDark ? "#24523F" : "#DCFCE7",
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <Scale size={15} color={isDark ? "#5EEAD4" : "#0F6E56"} />
            <Text
              style={[
                styles.netFinanceZakatHeading,
                {
                  color: isDark ? "#5EEAD4" : "#0F6E56",
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              How this helps calculate Zakat
            </Text>
          </View>

          <Text
            style={[
              styles.netFinanceZakatBody,
              {
                color: isDark ? "#C8E4D7" : "#1B4D3E",
                fontFamily: locale === "bn" ? "Bengali" : "Outfit",
              },
            ]}
          >
            {isNetIncome
              ? "Zakat is assessed on your total net wealth held for one lunar year (Hawl), not directly on monthly cashflow. If you retain this surplus in cash or savings, declare it under Assets so your Hawl and Nisab track it."
              : "A monthly deficit diminishes your cash reserves, reducing total zakat-eligible wealth. No zakat is levied on living expenses or losses."}
          </Text>

          {isNetIncome && potentialZakatDisplay ? (
            <View
              style={[
                styles.zakatReserveCallout,
                {
                  backgroundColor: isDark ? "#1A4032" : "#E2F6EE",
                  borderColor: isDark ? "#2A5B48" : "#C4EDDC",
                },
              ]}
            >
              <Text
                style={[
                  styles.zakatReserveLabel,
                  { color: isDark ? "#A7D5C4" : "#0F6E56" },
                ]}
              >
                Estimated 2.5% hawl reserve:
              </Text>
              <Text
                style={[
                  styles.zakatReserveValue,
                  { color: isDark ? "#5EEAD4" : "#0F6E56" },
                ]}
              >
                ~{potentialZakatDisplay}
              </Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.netFinanceActionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add to assets"
              onPress={() => router.push("/assets/new")}
              style={({ pressed }) => [
                styles.netFinanceActionBtnSecondary,
                {
                  backgroundColor: isDark ? "#1E4234" : "#FFFFFF",
                  borderColor: isDark ? "#2D5A47" : "#C8E4D7",
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Plus
                size={15}
                color={isDark ? "#5EEAD4" : "#0F6E56"}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.netFinanceActionTextSecondary,
                  { color: isDark ? "#5EEAD4" : "#0F6E56" },
                ]}
              >
                Add to assets
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View zakat"
              onPress={() => router.push("/zakat")}
              style={({ pressed }) => [
                styles.netFinanceActionBtnPrimary,
                {
                  backgroundColor: "#0F6E56",
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={styles.netFinanceActionTextPrimary}>View zakat</Text>
              <ChevronRight size={15} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* 4 & 5. Main Visual Dashboard Grid (Side-by-Side on Tablet/Desktop, Stacked on Mobile) */}
      <View
        style={
          isTablet
            ? {
                flexDirection: "row",
                gap: 14,
                alignItems: "stretch",
                marginBottom: 0,
              }
            : undefined
        }
      >
        {/* 4. Income vs Expenses Bar Chart Card */}
        <View
          style={[
            styles.cardContainer,
            isTablet && { flex: 1, marginBottom: 14 },
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#EDF2EE",
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              Income vs expenses
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#3B82F6" }]}
                />
                <Text
                  style={[
                    styles.legendText,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  Income
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#EF4444" }]}
                />
                <Text
                  style={[
                    styles.legendText,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  Expenses
                </Text>
              </View>
            </View>
          </View>

          <IncomeVsExpensesChart isDark={isDark} />
        </View>

        {/* 5. Spending by Category Card */}
        <View
          style={[
            styles.cardContainer,
            isTablet && { flex: 1, marginBottom: 14 },
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#EDF2EE",
            },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              {
                color: colors.ink,
                marginBottom: 16,
                fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
              },
            ]}
          >
            Spending by category
          </Text>

          {categoriesToRender.length === 0 ? (
            <Text
              style={{
                color: isDark ? "#94A3B8" : "#64748B",
                fontSize: 14,
                fontFamily: locale === "bn" ? "Bengali" : undefined,
              }}
            >
              No spending recorded in categories this month.
            </Text>
          ) : (
            <View style={styles.categoriesList}>
              {categoriesToRender.map(
                (cat: {
                  name: string;
                  amount: string;
                  percentage: number;
                  color: string;
                  badgeBg: string;
                  Icon: any;
                }) => (
                  <View key={cat.name} style={styles.categoryRow}>
                    {/* Icon Badge */}
                    <View
                      style={[
                        styles.categoryIconBadge,
                        { backgroundColor: cat.badgeBg },
                      ]}
                    >
                      <cat.Icon size={18} color={cat.color} strokeWidth={1.8} />
                    </View>

                    {/* Flexible Label (No rigid clipping) */}
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.categoryLabel,
                        {
                          color: colors.ink,
                          fontFamily:
                            locale === "bn" ? "Bengali" : "OutfitMedium",
                        },
                      ]}
                    >
                      {cat.name}
                    </Text>

                    {/* Progress Bar Track & Fill */}
                    <View
                      style={[
                        styles.progressTrack,
                        {
                          backgroundColor: isDark ? "#283832" : "#EDF2EE",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>

                    {/* Amount without truncation */}
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.categoryAmount,
                        {
                          color: colors.ink,
                          fontFamily:
                            locale === "bn" ? "Bengali" : "OutfitMedium",
                        },
                      ]}
                    >
                      {cat.amount}
                    </Text>
                  </View>
                ),
              )}
            </View>
          )}
        </View>
      </View>

      {/* 6. Sadaqah & All Transactions Card (Responsive Split on Mobile) */}
      <View
        style={[
          styles.sadaqahCard,
          {
            backgroundColor: isDark ? "#172E24" : "#EEF8F1",
            borderColor: isDark ? "#284A3B" : "#D7ECE0",
          },
          isNarrowScreen && {
            flexDirection: "column",
            alignItems: "stretch",
            gap: 12,
          },
        ]}
      >
        <View style={styles.sadaqahTopRow}>
          {/* Left: Sadaqah this month */}
          <View style={styles.sadaqahSection}>
            <View
              style={[
                styles.sproutBadge,
                { backgroundColor: isDark ? "#284A3B" : "#D6F2E3" },
              ]}
            >
              <Sprout size={20} color="#0F6E56" strokeWidth={2} />
            </View>
            <View style={styles.sadaqahTextCol}>
              <Text
                style={[
                  styles.sadaqahLabel,
                  { color: isDark ? "#A3D4B6" : "#5B6F68" },
                ]}
              >
                Sadaqah this month
              </Text>
              <Text
                style={[
                  styles.sadaqahValue,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                {sadaqahDisplay}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View
            style={[
              styles.sadaqahDivider,
              { backgroundColor: isDark ? "#284A3B" : "#CFE6DB" },
            ]}
          />

          {/* Middle: Lifetime */}
          <View style={styles.lifetimeCol}>
            <Text
              style={[
                styles.sadaqahLabel,
                { color: isDark ? "#A3D4B6" : "#5B6F68" },
              ]}
            >
              Lifetime
            </Text>
            <Text
              style={[
                styles.sadaqahValue,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {lifetimeDisplay}
            </Text>
          </View>
        </View>

        {/* Right / Bottom: All transactions link */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="All transactions"
          onPress={() => router.push("/transactions")}
          style={({ pressed }) => [
            styles.allTransactionsLink,
            isNarrowScreen && styles.allTransactionsLinkFull,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text
            style={[
              styles.allTransactionsText,
              { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
            ]}
          >
            All transactions
          </Text>
          <ChevronRight size={15} color="#0F6E56" strokeWidth={2.2} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topHeaderBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 4,
    marginBottom: 10,
  },
  titleColumn: {
    gap: 8,
  },
  screenTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 32,
    letterSpacing: -0.4,
  },
  monthFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    alignSelf: "flex-start",
  },
  monthFilterText: {
    fontFamily: "OutfitMedium",
    fontSize: 13,
  },
  filterCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  heroSection: {
    marginVertical: 12,
  },
  heroHeadlineDark: {
    fontFamily: "OutfitMedium",
    letterSpacing: -0.6,
  },
  heroHeadlineMuted: {
    fontFamily: "OutfitMedium",
    letterSpacing: -0.6,
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    minWidth: 0,
  },
  metricIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metricTextCol: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: "OutfitMedium",
    fontVariant: ["tabular-nums"],
  },
  cardContainer: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 16.5,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: "Outfit",
    fontSize: 12,
  },
  chartWrapper: {
    width: "100%",
    marginTop: 4,
  },
  categoriesList: {
    gap: 14,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  categoryLabel: {
    fontSize: 14,
    minWidth: 70,
    maxWidth: 120,
    flexShrink: 0,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  categoryAmount: {
    fontSize: 14,
    minWidth: 72,
    textAlign: "right",
    flexShrink: 0,
    fontVariant: ["tabular-nums"],
  },
  sadaqahCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sadaqahTopRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sadaqahSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  sproutBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sadaqahTextCol: {
    gap: 2,
    flexShrink: 1,
  },
  sadaqahLabel: {
    fontFamily: "Outfit",
    fontSize: 11.5,
  },
  sadaqahValue: {
    fontSize: 16.5,
    fontVariant: ["tabular-nums"],
  },
  sadaqahDivider: {
    width: 1,
    height: 30,
  },
  lifetimeCol: {
    gap: 2,
    flexShrink: 1,
  },
  allTransactionsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  allTransactionsLinkFull: {
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 110, 86, 0.15)",
    paddingTop: 10,
    paddingHorizontal: 0,
    justifyContent: "space-between",
  },
  allTransactionsText: {
    fontSize: 13,
    color: "#0F6E56",
  },
  netFinanceCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#0D4233",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  netFinanceTopRow: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  netFinanceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  netFinanceTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 16,
  },
  netFinanceSubtitle: {
    fontFamily: "Outfit",
    fontSize: 12,
    marginTop: 1,
  },
  netFinanceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  netFinanceBadgeText: {
    fontFamily: "OutfitMedium",
    fontSize: 10,
    fontWeight: "700",
  },
  netFinanceAmount: {
    fontFamily: "OutfitMedium",
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  netFinanceRateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  netFinanceRateText: {
    fontFamily: "OutfitMedium",
    fontSize: 11,
    fontWeight: "700",
  },
  netFinanceZakatBox: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  netFinanceZakatHeading: {
    fontFamily: "OutfitMedium",
    fontSize: 13,
    fontWeight: "700",
  },
  netFinanceZakatBody: {
    fontFamily: "Outfit",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  zakatReserveCallout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  zakatReserveLabel: {
    fontFamily: "OutfitMedium",
    fontSize: 12.5,
  },
  zakatReserveValue: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    fontWeight: "800",
  },
  netFinanceActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
    flexWrap: "wrap",
  },
  netFinanceActionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  netFinanceActionTextSecondary: {
    fontFamily: "OutfitMedium",
    fontSize: 12.5,
    fontWeight: "700",
  },
  netFinanceActionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  netFinanceActionTextPrimary: {
    fontFamily: "OutfitMedium",
    fontSize: 12.5,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
