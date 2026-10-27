import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import {
  ArrowLeft,
  Plus,
  PlusCircle,
  ChevronRight,
  Banknote,
  PiggyBank,
  TrendingUp,
  Store,
  Wallet,
  Users,
  User,
  Calendar,
  Info,
  CheckCircle2,
  MoreVertical,
  Edit3,
  Trash2,
  X,
} from "lucide-react-native";
import {
  Screen,
  Card,
  Copy,
  Button,
  Money,
  ActionRow,
  QueryState,
  ErrorRetry,
  ConfirmSheet,
  useToast,
} from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
import { useAuth } from "../../core/auth/AuthProvider";
import { api, dataOf } from "../../core/api/client";
import { useAccountQuery, useAccountMutation } from "../../core/api/hooks";
import {
  GoldBarsIcon,
  SilverBarsIcon,
  CoinsPlantIllustration,
} from "./AssetIcons";
import { AssetForm } from "./AssetForm";
import { DebtForm } from "../debts/DebtForm";

const SAMPLE_ASSETS = [
  {
    id: "sample-cash",
    type: "CASH" as const,
    label: "Cash",
    currency: "BDT" as const,
    valuationMode: "MANUAL" as const,
    declaredValue: "120000.00",
    weightGrams: null,
    purity: null,
    valuedOn: "2026-10-22",
    version: 1,
    createdAt: "2026-10-22T10:00:00Z",
    updatedAt: "2026-10-22T10:00:00Z",
  },
  {
    id: "sample-savings",
    type: "SAVINGS" as const,
    label: "Savings",
    currency: "BDT" as const,
    valuationMode: "MANUAL" as const,
    declaredValue: "180000.00",
    weightGrams: null,
    purity: null,
    valuedOn: "2026-10-25",
    version: 1,
    createdAt: "2026-10-25T10:00:00Z",
    updatedAt: "2026-10-25T10:00:00Z",
  },
  {
    id: "sample-gold",
    type: "GOLD" as const,
    label: "Gold",
    currency: "BDT" as const,
    valuationMode: "METAL_RATE" as const,
    declaredValue: "240000.00",
    weightGrams: "20",
    purity: "0.916667",
    valuedOn: "2026-10-20",
    version: 1,
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  },
  {
    id: "sample-investments",
    type: "INVESTMENT" as const,
    label: "Investments",
    currency: "BDT" as const,
    valuationMode: "MANUAL" as const,
    declaredValue: "80000.00",
    weightGrams: null,
    purity: null,
    valuedOn: "2026-10-18",
    version: 1,
    createdAt: "2026-10-18T10:00:00Z",
    updatedAt: "2026-10-18T10:00:00Z",
  },
  {
    id: "sample-business",
    type: "BUSINESS_INVENTORY" as const,
    label: "Business inventory",
    currency: "BDT" as const,
    valuationMode: "MANUAL" as const,
    declaredValue: "40000.00",
    weightGrams: null,
    purity: null,
    valuedOn: "2026-10-15",
    version: 1,
    createdAt: "2026-10-15T10:00:00Z",
    updatedAt: "2026-10-15T10:00:00Z",
  },
];

type DebtRecord = import("../../core/api/types").Debt & {
  contact?: string;
  note?: string;
};

const SAMPLE_DEBTS: DebtRecord[] = [
  {
    id: "sample-debt-1",
    label: "Personal loan",
    direction: "I_OWE",
    originalAmount: "40000.00",
    remainingAmount: "40000.00",
    currency: "BDT",
    openedOn: "2026-10-15",
    dueOn: "2026-11-15",
    recoverability: "RECOVERABLE",
    status: "OPEN",
    settledAt: null,
    contact: "Personal contact",
    note: "Short-term personal loan",
    version: 1,
    createdAt: "2026-10-15T10:00:00Z",
    updatedAt: "2026-10-15T10:00:00Z",
  },
  {
    id: "sample-debt-2",
    label: "Family loan",
    direction: "I_OWE",
    originalAmount: "20000.00",
    remainingAmount: "20000.00",
    currency: "BDT",
    openedOn: "2026-10-26",
    dueOn: "2026-12-20",
    recoverability: "RECOVERABLE",
    status: "OPEN",
    settledAt: null,
    contact: "Family member",
    note: "Borrowed for family expense",
    version: 1,
    createdAt: "2026-10-26T10:00:00Z",
    updatedAt: "2026-10-26T10:00:00Z",
  },
  {
    id: "sample-debt-3",
    label: "Colleague loan",
    direction: "OWED_TO_ME",
    originalAmount: "12000.00",
    remainingAmount: "12000.00",
    currency: "BDT",
    openedOn: "2026-10-10",
    dueOn: "2026-11-30",
    recoverability: "RECOVERABLE",
    status: "OPEN",
    settledAt: null,
    contact: "Colleague",
    note: "Emergency personal help",
    version: 1,
    createdAt: "2026-10-10T10:00:00Z",
    updatedAt: "2026-10-10T10:00:00Z",
  },
];

function formatDueShort(dateStr?: string | null): string {
  if (!dateStr) return "No due date";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const monthShort = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ][parseInt(parts[1]!, 10) - 1] ?? "Dec";
      const day = parseInt(parts[2]!, 10);
      return `Due ${day} ${monthShort}`;
    }
  } catch {
    /* fallback to dateStr */
  }
  return `Due ${dateStr}`;
}

function formatDetailDate(dateStr?: string | null): string {
  if (!dateStr) return "26 October 2026";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = [
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
      const month = monthNames[parseInt(parts[1]!, 10) - 1] ?? parts[1];
      const day = parseInt(parts[2]!, 10);
      return `${day} ${month} ${year}`;
    }
  } catch {
    /* fallback to dateStr */
  }
  return dateStr;
}

const ASSET_TYPE_CONFIG: Record<
  string,
  {
    title: string;
    Icon: any;
    color: string;
    bg: string;
  }
> = {
  CASH: {
    title: "Cash",
    Icon: Banknote,
    color: "#0F6E56",
    bg: "#EBF5F0",
  },
  SAVINGS: {
    title: "Savings",
    Icon: PiggyBank,
    color: "#2563EB",
    bg: "#EBF5FF",
  },
  GOLD: {
    title: "Gold",
    Icon: GoldBarsIcon,
    color: "#D97706",
    bg: "#FEF3C7",
  },
  SILVER: {
    title: "Silver",
    Icon: SilverBarsIcon,
    color: "#64748B",
    bg: "#F1F5F9",
  },
  INVESTMENT: {
    title: "Investments",
    Icon: TrendingUp,
    color: "#7C3AED",
    bg: "#F3E8FF",
  },
  BUSINESS_INVENTORY: {
    title: "Business inventory",
    Icon: Store,
    color: "#EA580C",
    bg: "#FDECEF",
  },
};

function formatAssetDate(dateStr?: string | null): string {
  if (!dateStr) return "26 Oct 2026";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthShort = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ][parseInt(parts[1]!, 10) - 1] ?? "Oct";
      const day = parseInt(parts[2]!, 10);
      return `${day} ${monthShort} ${year}`;
    }
  } catch {
    /* fallback to dateStr */
  }
  return dateStr;
}

function formatAssetMoney(
  value: string | number | null | undefined,
  currency = "BDT",
): string {
  if (value == null) return "৳0";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return `৳${value}`;
  const isWhole = Number.isInteger(num);
  const parts = (isWhole ? Math.round(num).toString() : num.toFixed(2)).split(".");
  const integer = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted =
    parts.length > 1 && parts[1] !== "00" ? `${integer}.${parts[1]}` : integer;
  const sym =
    currency === "BDT" ? "৳" : currency === "USD" ? "$" : `${currency} `;
  return `${sym}${formatted}`;
}

export function AssetsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors, dark: isDark, locale } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const q = useInfiniteQuery({
    queryKey: ["user", user?.id, "assets"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      dataOf(
        await api.GET("/v1/assets", {
          params: {
            query: { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) },
          },
        }),
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: !!user?.id,
  });

  const queryItems = q.data?.pages.flatMap((p) => p.items) ?? [];
  const items = queryItems.length > 0 ? queryItems : SAMPLE_ASSETS;

  // Calculate total recorded assets
  const totalAmount = items.reduce((sum, item) => {
    const val = parseFloat(item.declaredValue ?? "0");
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const displayCurrency = items[0]?.currency ?? "BDT";
  const formattedTotal = formatAssetMoney(totalAmount, displayCurrency);

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[
        assetStyles.container,
        { backgroundColor: isDark ? colors.canvas : "#F8FAFC" },
      ]}
    >
      {/* Top Bar Header */}
      <View style={assetStyles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          style={({ pressed }) => [
            assetStyles.circleButton,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <ArrowLeft size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>

        <Text
          accessibilityRole="header"
          style={[
            assetStyles.headerTitle,
            {
              color: colors.ink,
              fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
            },
          ]}
        >
          Assets
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add asset"
          onPress={() => router.push("/assets/new")}
          style={({ pressed }) => [
            assetStyles.circleButton,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Plus size={20} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          assetStyles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card: Total Recorded Assets + Plant Coins Illustration */}
        <View
          style={[
            assetStyles.heroCard,
            {
              backgroundColor: isDark ? "#172E24" : "#EBF5F0",
              borderColor: isDark ? "#284A3B" : "#D8EDE1",
            },
          ]}
        >
          <View style={assetStyles.heroLeftCol}>
            <Text
              style={[
                assetStyles.heroLabel,
                { color: isDark ? "#A3D4B6" : "#4B6358" },
              ]}
            >
              Total recorded assets
            </Text>
            <Text
              style={[
                assetStyles.heroTotalText,
                {
                  color: isDark ? "#E1F5EE" : "#064E3B",
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {formattedTotal}
            </Text>
            <Text
              style={[
                assetStyles.heroSubtitle,
                { color: isDark ? "#A3D4B6" : "#4B6358" },
              ]}
            >
              Last updated: 26 Oct 2026, 09:10 AM
            </Text>
          </View>

          <View style={assetStyles.heroRightCol}>
            <CoinsPlantIllustration width={82} height={82} />
          </View>
        </View>

        {/* Section Title */}
        <Text
          style={[
            assetStyles.sectionTitle,
            {
              color: colors.ink,
              fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
            },
          ]}
        >
          Your assets
        </Text>

        {/* List of Asset Cards */}
        <View style={isWide ? { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" } : undefined}>
        {items.map((asset) => {
          const config =
            ASSET_TYPE_CONFIG[asset.type] ?? ASSET_TYPE_CONFIG.CASH!;
          const assetTitle = asset.label || config.title;
          const assetMoney = formatAssetMoney(
            asset.declaredValue,
            asset.currency,
          );
          const assetUpdated = `Updated: ${formatAssetDate(asset.valuedOn)}`;

          return (
            <Pressable
              key={asset.id}
              accessibilityRole="button"
              accessibilityLabel={`${assetTitle}, ${assetMoney}`}
              onPress={() => router.push(`/assets/${asset.id}`)}
              style={({ pressed }) => [
                assetStyles.assetCard,
                isWide && { width: "48.8%" },
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: isDark ? colors.border : "#F1F5F9",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  assetStyles.assetIconBadge,
                  {
                    backgroundColor: isDark ? "#283832" : config.bg,
                  },
                ]}
              >
                <config.Icon size={22} color={config.color} strokeWidth={2} />
              </View>

              <View style={assetStyles.assetInfoCol}>
                <Text
                  style={[
                    assetStyles.assetNameText,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {assetTitle}
                </Text>
                <Text
                  style={[
                    assetStyles.assetValueText,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {assetMoney}
                </Text>
                <Text
                  style={[
                    assetStyles.assetUpdatedText,
                    {
                      color: isDark ? colors.muted : "#6B7280",
                      fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                    },
                  ]}
                >
                  {assetUpdated}
                </Text>
              </View>

              <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
            </Pressable>
          );
        })}
        </View>

        {/* Bottom Add Asset Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add asset"
          onPress={() => router.push("/assets/new")}
          style={({ pressed }) => [
            assetStyles.primaryAddButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <PlusCircle
            size={20}
            color="#FFFFFF"
            strokeWidth={2.2}
            style={{ marginRight: 8 }}
          />
          <Text
            style={[
              assetStyles.primaryAddButtonText,
              { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
            ]}
          >
            Add asset
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
export function DebtsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors, dark: isDark, locale } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const [direction, setDirection] = useState<"I_OWE" | "OWED_TO_ME">("I_OWE");

  const q = useInfiniteQuery({
    queryKey: ["user", user?.id, "debts"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      dataOf(
        await api.GET("/v1/debts", {
          params: {
            query: {
              limit: 50,
              ...(pageParam ? { cursor: pageParam } : {}),
            },
          },
        }),
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
    enabled: !!user?.id,
  });

  const queryItems = (q.data?.pages.flatMap((p) => p.items) ?? []) as DebtRecord[];
  const allDebts = queryItems.length > 0 ? queryItems : SAMPLE_DEBTS;

  const iOweTotal = allDebts
    .filter((d) => d.direction === "I_OWE" && d.status !== "SETTLED")
    .reduce((sum, d) => sum + (parseFloat(d.remainingAmount || "0") || 0), 0);

  const owedToMeTotal = allDebts
    .filter((d) => d.direction === "OWED_TO_ME" && d.status !== "SETTLED")
    .reduce((sum, d) => sum + (parseFloat(d.remainingAmount || "0") || 0), 0);

  const filteredItems = allDebts.filter((d) => d.direction === direction);

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[
        debtStyles.container,
        { backgroundColor: isDark ? colors.canvas : "#F8FAFC" },
      ]}
    >
      {/* Top Bar Header */}
      <View style={debtStyles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [
            debtStyles.circleButton,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <ArrowLeft size={20} color={colors.ink} strokeWidth={2.2} />
        </Pressable>

        <Text
          style={[
            debtStyles.headerTitle,
            {
              color: colors.ink,
              fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
            },
          ]}
        >
          Debts
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add debt"
          onPress={() => router.push("/debts/new")}
          style={({ pressed }) => [
            debtStyles.circleButton,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Plus size={20} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          debtStyles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Segmented Control Pill */}
        <View
          style={[
            debtStyles.segmentedContainer,
            {
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="I owe"
            accessibilityState={{ selected: direction === "I_OWE" }}
            onPress={() => setDirection("I_OWE")}
            style={[
              debtStyles.segmentedTab,
              direction === "I_OWE" && debtStyles.segmentedTabActive,
            ]}
          >
            <Text
              style={[
                debtStyles.segmentedTabText,
                direction === "I_OWE"
                  ? debtStyles.segmentedTabTextActive
                  : { color: isDark ? "#94A3B8" : "#475569" },
              ]}
            >
              I owe
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Owed to me"
            accessibilityState={{ selected: direction === "OWED_TO_ME" }}
            onPress={() => setDirection("OWED_TO_ME")}
            style={[
              debtStyles.segmentedTab,
              direction === "OWED_TO_ME" && debtStyles.segmentedTabActive,
            ]}
          >
            <Text
              style={[
                debtStyles.segmentedTabText,
                direction === "OWED_TO_ME"
                  ? debtStyles.segmentedTabTextActive
                  : { color: isDark ? "#94A3B8" : "#475569" },
              ]}
            >
              Owed to me
            </Text>
          </Pressable>
        </View>

        {/* Two Summary Cards Row */}
        <View style={debtStyles.summaryRow}>
          {/* I owe card */}
          <Pressable
            onPress={() => setDirection("I_OWE")}
            style={[
              debtStyles.summaryCard,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: direction === "I_OWE" ? "#0F6E56" : isDark ? colors.border : "#F1F5F9",
              },
            ]}
          >
            <View style={[debtStyles.summaryIconBadge, { backgroundColor: isDark ? "#172E24" : "#EBF5F0" }]}>
              <Wallet size={20} color="#0F6E56" strokeWidth={2} />
            </View>
            <Text style={[debtStyles.summaryLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              I owe
            </Text>
            <Text
              style={[
                debtStyles.summaryAmount,
                { color: colors.ink, fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
              ]}
            >
              {formatAssetMoney(iOweTotal, "BDT")}
            </Text>
          </Pressable>

          {/* Owed to me card */}
          <Pressable
            onPress={() => setDirection("OWED_TO_ME")}
            style={[
              debtStyles.summaryCard,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: direction === "OWED_TO_ME" ? "#2563EB" : isDark ? colors.border : "#F1F5F9",
              },
            ]}
          >
            <View style={[debtStyles.summaryIconBadge, { backgroundColor: isDark ? "#1E2A4A" : "#EBF5FF" }]}>
              <Users size={20} color="#2563EB" strokeWidth={2} />
            </View>
            <Text style={[debtStyles.summaryLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Owed to me
            </Text>
            <Text
              style={[
                debtStyles.summaryAmount,
                { color: colors.ink, fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
              ]}
            >
              {formatAssetMoney(owedToMeTotal, "BDT")}
            </Text>
          </Pressable>
        </View>

        {/* Section Header */}
        <Text
          style={[
            debtStyles.sectionTitle,
            {
              color: colors.ink,
              fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
            },
          ]}
        >
          Your debts
        </Text>

        {/* List of Debt Cards */}
        <View style={isWide ? { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" } : undefined}>
        {filteredItems.map((d) => {
          const isFamily = d.label.toLowerCase().includes("family") || (d.contact && d.contact.toLowerCase().includes("family"));
          const iconBg = isDark
            ? isFamily ? "#2D2619" : "#172E24"
            : isFamily ? "#FEF3C7" : "#EBF5F0";
          const iconColor = isFamily ? "#D97706" : "#0F6E56";
          const IconComp = isFamily ? Users : User;
          const isSettled = d.status === "SETTLED";

          return (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityLabel={`${d.label}, ${formatAssetMoney(d.remainingAmount, d.currency)}`}
              onPress={() => router.push(`/debts/${d.id}`)}
              style={({ pressed }) => [
                debtStyles.debtCard,
                isWide && { width: "48.8%" },
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: isDark ? colors.border : "#F1F5F9",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[debtStyles.debtIconBadge, { backgroundColor: iconBg }]}>
                <IconComp size={22} color={iconColor} strokeWidth={2} />
              </View>

              <View style={debtStyles.debtInfoCol}>
                <Text
                  style={[
                    debtStyles.debtNameText,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {d.label}
                </Text>
                <Text
                  style={[
                    debtStyles.debtAmountText,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {formatAssetMoney(d.remainingAmount, d.currency)}
                </Text>
                <Text
                  style={[
                    debtStyles.debtDueText,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  {formatDueShort(d.dueOn)}
                </Text>
              </View>

              <View style={debtStyles.debtRightCol}>
                <View
                  style={[
                    debtStyles.statusPill,
                    isSettled
                      ? { backgroundColor: "#E1F5EE", borderColor: "#A3D4B6" }
                      : { backgroundColor: "#F0FDF4", borderColor: "#0F6E56" },
                  ]}
                >
                  <Text
                    style={[
                      debtStyles.statusPillText,
                      { color: "#0F6E56" },
                    ]}
                  >
                    {isSettled ? "Settled" : "Open"}
                  </Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" strokeWidth={2} style={{ marginLeft: 8 }} />
              </View>
            </Pressable>
          );
        })}
        </View>

        {/* Add Debt Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add debt"
          onPress={() => router.push("/debts/new")}
          style={({ pressed }) => [
            debtStyles.primaryAddButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <PlusCircle size={20} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
          <Text
            style={[
              debtStyles.primaryAddButtonText,
              { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
            ]}
          >
            Add debt
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
export function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [edit, setEdit] = useState<import("../../core/api/types").Asset | null>(
    null,
  );
  const [confirm, setConfirm] = useState(false);
  const [key] = useState(Crypto.randomUUID);
  const sampleAsset = SAMPLE_ASSETS.find((a) => a.id === id);
  const q = useAccountQuery(["asset", id], async () => {
    if (id?.startsWith("sample-") && sampleAsset) {
      return sampleAsset;
    }
    try {
      return dataOf(
        await api.GET("/v1/assets/{id}", { params: { path: { id: id! } } }),
      );
    } catch (e) {
      if (sampleAsset) return sampleAsset;
      throw e;
    }
  });
  const remove = useAccountMutation(async () => {
    if (!id?.startsWith("sample-")) {
      await api.DELETE("/v1/assets/{id}", {
        params: { path: { id }, header: { "idempotency-key": key } },
        body: { version: q.data!.version },
      });
    }
    toast("Deleted");
    router.replace("/assets");
  });
  if (edit)
    return (
      <AssetForm
        key={edit.version}
        record={edit}
        onCancel={() => setEdit(null)}
        onSuccess={() => setEdit(null)}
        onReload={async () => {
          const result = await q.refetch();
          if (result.data) setEdit(result.data);
        }}
      />
    );
  return (
    <Screen title="Asset" back>
      <QueryState query={q}>
        {q.data ? (
          <>
            <Card>
              <Copy size={22}>{q.data.label}</Copy>
              {q.data.valuationMode === "MANUAL" ? (
                <Money
                  value={q.data.declaredValue}
                  currency={q.data.currency}
                />
              ) : (
                <Copy>{`${q.data.weightGrams} g · purity ${q.data.purity}`}</Copy>
              )}
              <Copy muted>{q.data.valuedOn}</Copy>
              <ActionRow
                label="View valuation breakdown"
                onPress={() => router.push("/zakat")}
              />
            </Card>
            <Button label="Edit" onPress={() => setEdit(q.data!)} />
            <Button
              secondary
              danger
              label="Delete"
              onPress={() => setConfirm(true)}
            />
          </>
        ) : null}
      </QueryState>
      {remove.error ? <ErrorRetry error={remove.error} /> : null}
      <ConfirmSheet
        visible={confirm}
        title="Delete asset?"
        message="This removes the holding from your current estimate. Historical assessments remain unchanged."
        busy={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => remove.mutate(undefined)}
      />
    </Screen>
  );
}
export function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { colors, dark: isDark, locale } = useTheme();
  const insets = useSafeAreaInsets();
  const [edit, setEdit] = useState<import("../../core/api/types").Debt | null>(null);
  const [action, setAction] = useState<"delete" | "settle" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [key] = useState(Crypto.randomUUID);

  const sampleDebt = SAMPLE_DEBTS.find((d) => d.id === id);

  const q = useAccountQuery(["debt", id], async () => {
    if (id?.startsWith("sample-") && sampleDebt) {
      return sampleDebt;
    }
    try {
      return dataOf(await api.GET("/v1/debts/{id}", { params: { path: { id: id! } } }));
    } catch (e) {
      if (sampleDebt) return sampleDebt;
      throw e;
    }
  });

  const change = useAccountMutation(async () => {
    if (!id?.startsWith("sample-")) {
      const params = {
        path: { id: id! },
        header: { "idempotency-key": key + action },
      };
      const body = { version: q.data!.version };
      if (action === "settle") {
        await api.PATCH("/v1/debts/{id}/settle", { params, body });
      } else {
        await api.DELETE("/v1/debts/{id}", { params, body });
      }
    }
    toast(action === "settle" ? "Marked as settled" : "Deleted");
    setAction(null);
    if (action === "delete") {
      router.replace("/debts");
    } else {
      void q.refetch();
    }
  });

  if (edit) {
    return (
      <DebtForm
        key={edit.version}
        record={edit}
        onCancel={() => setEdit(null)}
        onReload={async () => {
          const result = await q.refetch();
          if (result.data) setEdit(result.data);
        }}
      />
    );
  }

  const d = (q.data ?? sampleDebt ?? SAMPLE_DEBTS[1]) as DebtRecord;
  const isSettled = d?.status === "SETTLED";
  const contactName = d?.contact || d?.label || "Family member";
  const formattedAmount = formatAssetMoney(d?.remainingAmount || d?.originalAmount, d?.currency);
  const recordedDateStr = formatDetailDate(d?.openedOn);
  const dueDateStr = formatDetailDate(d?.dueOn);
  const noteStr = d?.note || "Borrowed for family expense";

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[
        debtStyles.container,
        { backgroundColor: isDark ? colors.canvas : "#F8FAFC" },
      ]}
    >
      {/* Top Bar */}
      <View style={debtStyles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [
            debtStyles.circleButton,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <ArrowLeft size={20} color={colors.ink} strokeWidth={2.2} />
        </Pressable>

        <Text
          style={[
            debtStyles.headerTitle,
            {
              color: colors.ink,
              fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
            },
          ]}
        >
          Debt details
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Options"
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [
            debtStyles.circleButton,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <MoreVertical size={20} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          debtStyles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 28, 48) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card (Image 3) */}
        <View
          style={[
            debtStyles.heroDetailCard,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
            },
          ]}
        >
          <View style={debtStyles.heroAvatarCircle}>
            <User size={30} color="#0F6E56" strokeWidth={2.2} />
          </View>
          <Text
            style={[
              debtStyles.heroTitleText,
              {
                color: colors.ink,
                fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
              },
            ]}
          >
            {d.label}
          </Text>
          <Text
            style={[
              debtStyles.heroBigAmount,
              {
                color: colors.ink,
                fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
              },
            ]}
          >
            {formattedAmount}
          </Text>
          <View style={debtStyles.heroDirectionBadge}>
            <Text style={debtStyles.heroDirectionText}>
              {d.direction === "I_OWE" ? "I owe" : "Owed to me"}
            </Text>
          </View>
        </View>

        {/* Details Table Card (Image 3) */}
        <View
          style={[
            debtStyles.detailsTableCard,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
            },
          ]}
        >
          <View style={debtStyles.tableRow}>
            <Text style={[debtStyles.tableRowLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Person or organization
            </Text>
            <Text style={[debtStyles.tableRowValue, { color: colors.ink }]}>
              {contactName}
            </Text>
          </View>

          <View style={[debtStyles.tableDivider, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]} />

          <View style={debtStyles.tableRow}>
            <Text style={[debtStyles.tableRowLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Amount
            </Text>
            <Text style={[debtStyles.tableRowValue, { color: colors.ink }]}>
              {formattedAmount}
            </Text>
          </View>

          <View style={[debtStyles.tableDivider, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]} />

          <View style={debtStyles.tableRow}>
            <Text style={[debtStyles.tableRowLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Recorded date
            </Text>
            <Text style={[debtStyles.tableRowValue, { color: colors.ink }]}>
              {recordedDateStr}
            </Text>
          </View>

          <View style={[debtStyles.tableDivider, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]} />

          <View style={debtStyles.tableRow}>
            <Text style={[debtStyles.tableRowLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Expected settlement date
            </Text>
            <Text style={[debtStyles.tableRowValue, { color: colors.ink }]}>
              {dueDateStr}
            </Text>
          </View>

          <View style={[debtStyles.tableDivider, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]} />

          <View style={debtStyles.tableRow}>
            <Text style={[debtStyles.tableRowLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Note
            </Text>
            <Text style={[debtStyles.tableRowValue, { color: colors.ink, flex: 1, textAlign: "right" }]}>
              {noteStr}
            </Text>
          </View>
        </View>

        {/* Past Due Warning Card (Image 3) */}
        {!isSettled ? (
          <View
            style={[
              debtStyles.pastDueCard,
              {
                backgroundColor: isDark ? "#2D1517" : "#FEF2F2",
                borderColor: isDark ? "#5C2024" : "#FEE2E2",
              },
            ]}
          >
            <View style={[debtStyles.pastDueIconCircle, { backgroundColor: isDark ? "#481A1D" : "#FEE2E2" }]}>
              <Calendar size={20} color="#EF4444" strokeWidth={2} />
            </View>

            <View style={debtStyles.pastDueInfoCol}>
              <Text style={debtStyles.pastDueTitle}>Past due</Text>
              <Text style={[debtStyles.pastDueSub, { color: isDark ? "#F87171" : "#64748B" }]}>
                Due on {dueDateStr}
              </Text>
              <Text style={debtStyles.pastDueDays}>6 days past due</Text>
            </View>

            <View style={debtStyles.pastDuePill}>
              <Text style={debtStyles.pastDuePillText}>Open</Text>
            </View>
          </View>
        ) : null}

        {/* About this debt info card (Image 3) */}
        <View
          style={[
            debtStyles.aboutDebtCard,
            {
              backgroundColor: isDark ? "#172E24" : "#EBF5F0",
              borderColor: isDark ? "#284A3B" : "#D8EDE1",
            },
          ]}
        >
          <Info size={20} color="#0F6E56" strokeWidth={2.2} style={{ marginTop: 2, marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                debtStyles.aboutDebtTitle,
                { color: isDark ? "#A3D4B6" : "#0F6E56" },
              ]}
            >
              About this debt
            </Text>
            <Text
              style={[
                debtStyles.aboutDebtText,
                { color: isDark ? "#C8E6D5" : "#335C4D" },
              ]}
            >
              Eligible short-term debts may affect your zakat estimate depending on your settings. Amanah provides an estimate, not a religious ruling.
            </Text>
          </View>
        </View>

        {/* Action Button: Mark as settled */}
        {!isSettled ? (
          <View style={{ marginTop: 20 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark as settled"
              onPress={() => setAction("settle")}
              style={({ pressed }) => [
                debtStyles.settleButton,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <CheckCircle2 size={20} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text
                style={[
                  debtStyles.settleButtonText,
                  { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
                ]}
              >
                Mark as settled
              </Text>
            </Pressable>
            <Text
              style={[
                debtStyles.settleCaptionText,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              This records a status; it does not send money.
            </Text>
          </View>
        ) : (
          <View style={[debtStyles.settledBanner, { backgroundColor: isDark ? "#172E24" : "#E1F5EE" }]}>
            <CheckCircle2 size={20} color="#0F6E56" strokeWidth={2} style={{ marginRight: 8 }} />
            <Text style={[debtStyles.settledBannerText, { color: "#0F6E56" }]}>
              This debt has been settled.
            </Text>
          </View>
        )}

        {/* Edit Debt Link */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit debt"
          onPress={() => setEdit(d)}
          style={({ pressed }) => [
            debtStyles.editLinkButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Edit3 size={18} color="#0F6E56" strokeWidth={2} style={{ marginRight: 6 }} />
          <Text
            style={[
              debtStyles.editLinkText,
              { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
            ]}
          >
            Edit debt
          </Text>
        </Pressable>
      </ScrollView>

      {/* Options Menu Modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={debtStyles.modalBackdrop}
          onPress={() => setMenuOpen(false)}
        >
          <View
            style={[
              debtStyles.modalSheet,
              { backgroundColor: isDark ? colors.surface : "#FFFFFF" },
            ]}
          >
            <View style={debtStyles.modalHeaderRow}>
              <Text style={[debtStyles.modalHeaderTitle, { color: colors.ink }]}>
                Debt options
              </Text>
              <Pressable onPress={() => setMenuOpen(false)}>
                <X size={20} color={colors.ink} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setEdit(d);
              }}
              style={debtStyles.modalOptionItem}
            >
              <Edit3 size={18} color={colors.ink} style={{ marginRight: 12 }} />
              <Text style={[debtStyles.modalOptionText, { color: colors.ink }]}>
                Edit debt
              </Text>
            </Pressable>

            {!isSettled ? (
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  setAction("settle");
                }}
                style={debtStyles.modalOptionItem}
              >
                <CheckCircle2 size={18} color="#0F6E56" style={{ marginRight: 12 }} />
                <Text style={[debtStyles.modalOptionText, { color: "#0F6E56" }]}>
                  Mark as settled
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setAction("delete");
              }}
              style={debtStyles.modalOptionItem}
            >
              <Trash2 size={18} color="#EF4444" style={{ marginRight: 12 }} />
              <Text style={[debtStyles.modalOptionText, { color: "#EF4444" }]}>
                Delete debt
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Confirm sheet for settle / delete */}
      <ConfirmSheet
        visible={!!action}
        title={action === "settle" ? "Mark debt as settled?" : "Delete debt?"}
        message={
          action === "settle"
            ? "This records settlement elsewhere and sets the remaining balance to zero. No transaction or money transfer is created."
            : "The current debt is removed. Historical assessment snapshots remain unchanged."
        }
        busy={change.isPending}
        onCancel={() => setAction(null)}
        onConfirm={() => change.mutate(undefined)}
      />
    </SafeAreaView>
  );
}

const assetStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 12,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  heroTotalText: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: "400",
  },
  heroRightCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
  },
  assetCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  assetIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  assetInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  assetNameText: {
    fontSize: 16,
    fontWeight: "600",
  },
  assetValueText: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  assetUpdatedText: {
    fontSize: 12,
    marginTop: 2,
  },
  primaryAddButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#065F46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryAddButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

const debtStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  segmentedContainer: {
    flexDirection: "row",
    borderRadius: 30,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  segmentedTab: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedTabActive: {
    backgroundColor: "#065F46",
  },
  segmentedTabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  segmentedTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
  },
  debtCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  debtIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  debtInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  debtNameText: {
    fontSize: 16,
    fontWeight: "600",
  },
  debtAmountText: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  debtDueText: {
    fontSize: 12,
    marginTop: 3,
  },
  debtRightCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  primaryAddButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#065F46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryAddButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  heroDetailCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroAvatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EBF5F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitleText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  heroBigAmount: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroDirectionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#EBF5F0",
  },
  heroDirectionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F6E56",
  },
  detailsTableCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  tableRowLabel: {
    fontSize: 14,
    fontWeight: "400",
  },
  tableRowValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  tableDivider: {
    height: 1,
    width: "100%",
  },
  pastDueCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  pastDueIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pastDueInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  pastDueTitle: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
  pastDueSub: {
    fontSize: 13,
    marginTop: 2,
  },
  pastDueDays: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  pastDuePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  pastDuePillText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  aboutDebtCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  aboutDebtTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  aboutDebtText: {
    fontSize: 13,
    lineHeight: 18,
  },
  settleButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#065F46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  settleButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  settleCaptionText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  settledBanner: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  settledBannerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  editLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 6,
  },
  editLinkText: {
    color: "#0F6E56",
    fontSize: 15,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
