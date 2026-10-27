import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Clipboard from "expo-clipboard";
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Trash2,
  ShoppingCart,
  Receipt,
  Bus,
  Heart,
  CreditCard,
  Briefcase,
  Building2,
  Gift,
  TrendingUp,
  MoreHorizontal,
  Copy as CopyIcon,
} from "lucide-react-native";
import {
  Screen,
  Copy,
  Card,
  Field,
  Choice,
  Button,
  Empty,
  ErrorRetry,
  QueryState,
  ConfirmSheet,
  useToast,
} from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
import { useAuth } from "../../core/auth/AuthProvider";
import { api, dataOf } from "../../core/api/client";
import {
  useAccountQuery,
  useAccountMutation,
  snapshotRead,
} from "../../core/api/hooks";
import { monthNow } from "../../core/i18n/formatters";
import type { Transaction } from "../../core/api/types";
import { TransactionRow } from "./TransactionRow";
import { TransactionForm } from "./TransactionForm";
export function TransactionsScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [month, setMonth] = useState(
    monthNow(auth.account!.preferences.timezone),
  );
  const [filter, setFilter] = useState("ALL");
  const query = useInfiniteQuery({
    queryKey: ["user", auth.user!.id, "transactions", month, filter],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      snapshotRead(
        auth.user!.id,
        ["transaction-page", month, filter, pageParam ?? null],
        async () =>
          dataOf(
            await api.GET("/v1/transactions", {
              params: {
                query: {
                  month,
                  limit: 20,
                  ...(pageParam ? { cursor: pageParam } : {}),
                  ...(filter === "SADAQAH"
                    ? { isSadaqah: "true" }
                    : filter !== "ALL"
                      ? { type: filter as "INCOME" | "EXPENSE" }
                      : {}),
                },
              },
            }),
          ),
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const records = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Screen
      title="Transactions"
      back
      refresh={() => {
        void query.refetch();
      }}
      busy={query.isRefetching}
    >
      <Button
        label="Add expense"
        onPress={() => router.push("/transactions/new?type=EXPENSE")}
      />
      <Button
        secondary
        label="Add income"
        onPress={() => router.push("/transactions/new?type=INCOME")}
      />
      <Card>
        <Field label="Month (YYYY-MM)" value={month} onChangeText={setMonth} />
        <Choice
          label="Filter"
          value={filter}
          options={["ALL", "INCOME", "EXPENSE", "SADAQAH"].map((v) => ({
            value: v,
            label: v,
          }))}
          onChange={setFilter}
        />
      </Card>
      <QueryState query={query}>
        {(
          query.data?.pages[0] as
            { __offline?: boolean; __capturedAt?: string } | undefined
        )?.__offline ? (
          <Card>
            <Copy>Read-only saved data</Copy>
            <Copy muted>
              {
                (query.data!.pages[0] as unknown as { __capturedAt: string })
                  .__capturedAt
              }
            </Copy>
          </Card>
        ) : null}
        {records.length ? (
          <Card>
            {records.map((r) => (
              <TransactionRow key={r.id} record={r} />
            ))}
          </Card>
        ) : (
          <Empty
            message="No records match this month and filter."
            label="Clear filters"
            action={() => {
              setFilter("ALL");
              setMonth(monthNow(auth.account!.preferences.timezone));
            }}
          />
        )}
        {query.hasNextPage ? (
          <Button
            secondary
            label="Load more"
            busy={query.isFetchingNextPage}
            onPress={() => {
              void query.fetchNextPage();
            }}
          />
        ) : null}
      </QueryState>
    </Screen>
  );
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

function formatDetailDate(isoDate?: string | null, locale = "en"): string {
  if (!isoDate) return "—";
  try {
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1]!, 10) - 1;
      const day = parseInt(parts[2]!, 10);
      const month = MONTH_NAMES[monthIdx];
      if (month && !isNaN(day)) {
        const text = `${day} ${month} ${year}`;
        return locale === "bn"
          ? text.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]!)
          : text;
      }
    }
  } catch {
    /* fallback to unparsed isoDate */
  }
  return isoDate;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  SAR: "SAR ",
  AED: "AED ",
  INR: "₹",
  MYR: "RM ",
  CAD: "CA$",
  AUD: "AU$",
};

function formatAmount(
  amountStr: string | null | undefined,
  currency = "BDT",
  type: "INCOME" | "EXPENSE" = "EXPENSE",
  locale = "en",
) {
  if (!amountStr) {
    const sym = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
    return `${type === "EXPENSE" ? "-" : "+"}${sym}0`;
  }
  const sign = type === "EXPENSE" ? "-" : "+";
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;

  let formattedNumber = amountStr;
  try {
    const num = parseFloat(amountStr);
    if (!isNaN(num)) {
      const isInteger = num % 1 === 0 || amountStr.endsWith(".00");
      const parts = (isInteger ? Math.round(num).toString() : num.toFixed(2)).split(".");
      const integerPart = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      formattedNumber =
        parts.length > 1 && parts[1] !== "00"
          ? `${integerPart}.${parts[1]}`
          : integerPart;
    }
  } catch {
    formattedNumber = amountStr;
  }

  if (locale === "bn") {
    formattedNumber = formattedNumber.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]!);
  }

  return `${sign}${symbol}${formattedNumber}`;
}

const CATEGORY_MAP: Record<
  string,
  {
    heroTitle: string;
    categoryLabel: string;
    Icon: any;
    color: string;
    bg: string;
  }
> = {
  FOOD: {
    heroTitle: "Groceries",
    categoryLabel: "Food",
    Icon: ShoppingCart,
    color: "#111827",
    bg: "#FDECEF",
  },
  GROCERIES: {
    heroTitle: "Groceries",
    categoryLabel: "Food",
    Icon: ShoppingCart,
    color: "#111827",
    bg: "#FDECEF",
  },
  BILLS: {
    heroTitle: "Bills & Utilities",
    categoryLabel: "Bills",
    Icon: Receipt,
    color: "#2563EB",
    bg: "#EBF5FF",
  },
  TRANSPORT: {
    heroTitle: "Transport",
    categoryLabel: "Transport",
    Icon: Bus,
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  SADAQAH: {
    heroTitle: "Sadaqah & Charity",
    categoryLabel: "Charity",
    Icon: Heart,
    color: "#0F6E56",
    bg: "#DCF5EC",
  },
  DEBT_REPAYMENT: {
    heroTitle: "Debt Repayment",
    categoryLabel: "Debt",
    Icon: CreditCard,
    color: "#8B5CF6",
    bg: "#F3E8FF",
  },
  SALARY: {
    heroTitle: "Salary",
    categoryLabel: "Salary",
    Icon: Briefcase,
    color: "#0284C7",
    bg: "#EBF5FF",
  },
  BUSINESS: {
    heroTitle: "Business Revenue",
    categoryLabel: "Business",
    Icon: Building2,
    color: "#0F6E56",
    bg: "#DCF5EC",
  },
  GIFT: {
    heroTitle: "Gift",
    categoryLabel: "Gift",
    Icon: Gift,
    color: "#D97706",
    bg: "#FEF3C7",
  },
  INVESTMENT_RETURN: {
    heroTitle: "Investment Return",
    categoryLabel: "Investment",
    Icon: TrendingUp,
    color: "#7C3AED",
    bg: "#F3E8FF",
  },
  OTHER: {
    heroTitle: "General Expense",
    categoryLabel: "Other",
    Icon: MoreHorizontal,
    color: "#64748B",
    bg: "#F1F5F9",
  },
};

const SAMPLE_TRANSACTION: Transaction = {
  id: "sample-groceries-1850",
  type: "EXPENSE",
  category: "FOOD",
  amount: "1850.00",
  currency: "BDT",
  localDate: "2026-10-26",
  description: "Weekly groceries",
  isSadaqah: false,
  reportingCurrency: "BDT",
  reportingRate: "1.000000",
  reportingAmount: "1850.00",
  rateSource: "MANUAL",
  rateAt: "2026-10-26T10:00:00.000Z",
  rateEstimated: false,
  version: 1,
  createdAt: "2026-10-26T10:00:00.000Z",
  updatedAt: "2026-10-26T10:00:00.000Z",
};

export function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { colors, dark: isDark, locale } = useTheme();
  const insets = useSafeAreaInsets();
  const [edit, setEdit] = useState<Transaction | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [key] = useState(Crypto.randomUUID);

  const isSample = !id || id === "sample" || id === "preview" || id === "demo";

  const query = useAccountQuery(["transaction", id], async () => {
    if (isSample) return SAMPLE_TRANSACTION;
    return dataOf(
      await api.GET("/v1/transactions/{id}", {
        params: { path: { id: id! } },
      }),
    );
  });

  const transaction = query.data ?? (isSample ? SAMPLE_TRANSACTION : null);

  const remove = useAccountMutation(async () => {
    if (transaction?.id === SAMPLE_TRANSACTION.id) {
      toast("Deleted");
      router.replace("/transactions");
      return;
    }
    await api.DELETE("/v1/transactions/{id}", {
      params: { path: { id: id! }, header: { "idempotency-key": key } },
      headers: { "idempotency-key": key },
      body: { version: transaction!.version },
    });
    toast("Deleted");
    router.replace("/transactions");
  });

  const handleCopyDetails = async () => {
    if (!transaction) return;
    const text = `Transaction: ${transaction.description || transaction.category} (${formatAmount(
      transaction.amount,
      transaction.currency,
      transaction.type,
      locale,
    )})\nDate: ${formatDetailDate(transaction.localDate, locale)}\nID: ${transaction.id}`;
    await Clipboard.setStringAsync(text);
    toast("Details copied to clipboard");
    setMoreMenuOpen(false);
  };

  if (edit) {
    return (
      <TransactionForm
        key={edit.version}
        record={edit}
        onCancel={() => setEdit(null)}
        onSuccess={async () => {
          setEdit(null);
          await query.refetch();
        }}
        onReload={async () => {
          const result = await query.refetch();
          if (result.data) setEdit(result.data);
        }}
      />
    );
  }

  // Loading state when real ID is pending
  if (!transaction && query.isPending) {
    return (
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={[
          styles.container,
          { backgroundColor: isDark ? colors.canvas : "#F8FAFC" },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/transactions")
            }
            style={[
              styles.circleButton,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: isDark ? colors.border : "#F1F5F9",
              },
            ]}
          >
            <ArrowLeft size={20} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={[
              styles.headerTitle,
              {
                color: colors.ink,
                fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
              },
            ]}
          >
            Transaction details
          </Text>
          <View style={styles.circleButtonPlaceholder} />
        </View>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (!transaction && query.error) {
    return (
      <Screen title="Transaction details" back>
        <ErrorRetry
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      </Screen>
    );
  }

  if (!transaction) return null;

  const categoryKey = transaction.category.toUpperCase();
  const meta =
    CATEGORY_MAP[categoryKey] ?? {
      heroTitle: transaction.category.replaceAll("_", " "),
      categoryLabel: transaction.category.replaceAll("_", " "),
      Icon: transaction.type === "INCOME" ? TrendingUp : ShoppingCart,
      color: transaction.type === "INCOME" ? "#0F6E56" : "#111827",
      bg: transaction.type === "INCOME" ? "#DCF5EC" : "#FDECEF",
    };

  const formattedAmount = formatAmount(
    transaction.amount,
    transaction.currency,
    transaction.type,
    locale,
  );

  const formattedDate = formatDetailDate(transaction.localDate, locale);
  const typeText =
    transaction.type === "EXPENSE"
      ? "Expense"
      : transaction.isSadaqah
        ? "Sadaqah"
        : "Income";

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.canvas : "#F8FAFC" },
      ]}
    >
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/transactions")
          }
          style={({ pressed }) => [
            styles.circleButton,
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
            styles.headerTitle,
            {
              color: colors.ink,
              fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
            },
          ]}
        >
          Transaction details
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options"
          onPress={() => setMoreMenuOpen(true)}
          style={({ pressed }) => [
            styles.circleButton,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <MoreVertical size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Top Hero Summary Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
            },
          ]}
        >
          {/* Circular Category Icon Badge */}
          <View
            style={[
              styles.heroIconBadge,
              {
                backgroundColor: isDark ? "#2A1F22" : meta.bg,
              },
            ]}
          >
            <meta.Icon
              size={34}
              color={isDark ? "#FFA5A1" : meta.color}
              strokeWidth={2}
            />
          </View>

          {/* Hero Merchant/Category Title */}
          <Text
            style={[
              styles.heroTitleText,
              {
                color: colors.ink,
                fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
              },
            ]}
          >
            {meta.heroTitle}
          </Text>

          {/* Large Bold Amount */}
          <Text
            style={[
              styles.heroAmountText,
              {
                color: colors.ink,
                fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
              },
            ]}
          >
            {formattedAmount}
          </Text>

          {/* Subtitle Label (Expense / Income / Sadaqah) */}
          <Text
            style={[
              styles.heroSubtitleText,
              {
                color: isDark ? colors.muted : "#6B7280",
                fontFamily: locale === "bn" ? "Bengali" : "Outfit",
              },
            ]}
          >
            {typeText}
          </Text>
        </View>

        {/* Card 2: Details List Card */}
        <View
          style={[
            styles.detailsCard,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
            },
          ]}
        >
          {/* Row 1: Date */}
          <View style={styles.detailRow}>
            <Text
              style={[
                styles.detailLabel,
                {
                  color: isDark ? colors.muted : "#6B7280",
                  fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                },
              ]}
            >
              Date
            </Text>
            <Text
              style={[
                styles.detailValue,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {formattedDate}
            </Text>
          </View>

          <View
            style={[
              styles.detailDivider,
              { backgroundColor: isDark ? colors.border : "#F1F5F9" },
            ]}
          />

          {/* Row 2: Category with Small Icon Badge */}
          <View style={styles.detailRow}>
            <Text
              style={[
                styles.detailLabel,
                {
                  color: isDark ? colors.muted : "#6B7280",
                  fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                },
              ]}
            >
              Category
            </Text>
            <View style={styles.categoryValueContainer}>
              <View
                style={[
                  styles.smallIconBadge,
                  {
                    backgroundColor: isDark ? "#2A1F22" : meta.bg,
                  },
                ]}
              >
                <meta.Icon
                  size={14}
                  color={isDark ? "#FFA5A1" : meta.color}
                  strokeWidth={2}
                />
              </View>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                {meta.categoryLabel}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.detailDivider,
              { backgroundColor: isDark ? colors.border : "#F1F5F9" },
            ]}
          />

          {/* Row 3: Note */}
          <View style={styles.detailRow}>
            <Text
              style={[
                styles.detailLabel,
                {
                  color: isDark ? colors.muted : "#6B7280",
                  fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                },
              ]}
            >
              Note
            </Text>
            <Text
              numberOfLines={2}
              style={[
                styles.detailValue,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  maxWidth: "65%",
                  textAlign: "right",
                },
              ]}
            >
              {transaction.description || "—"}
            </Text>
          </View>

          <View
            style={[
              styles.detailDivider,
              { backgroundColor: isDark ? colors.border : "#F1F5F9" },
            ]}
          />

          {/* Row 4: Currency */}
          <View style={styles.detailRow}>
            <Text
              style={[
                styles.detailLabel,
                {
                  color: isDark ? colors.muted : "#6B7280",
                  fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                },
              ]}
            >
              Currency
            </Text>
            <Text
              style={[
                styles.detailValue,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {transaction.currency}
            </Text>
          </View>

          {/* Optional Exchange Rate Row if foreign currency */}
          {transaction.reportingCurrency &&
          transaction.reportingCurrency !== transaction.currency ? (
            <>
              <View
                style={[
                  styles.detailDivider,
                  { backgroundColor: isDark ? colors.border : "#F1F5F9" },
                ]}
              />
              <View style={styles.detailRow}>
                <Text
                  style={[
                    styles.detailLabel,
                    {
                      color: isDark ? colors.muted : "#6B7280",
                      fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                    },
                  ]}
                >
                  Rate
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: isDark ? colors.muted : "#6B7280",
                      fontSize: 13,
                      fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                    },
                  ]}
                >
                  {`1 ${transaction.currency} ≈ ${transaction.reportingRate} ${transaction.reportingCurrency}`}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionButtonsContainer}>
          {/* Primary Action Button: Edit transaction */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit transaction"
            onPress={() => setEdit(transaction)}
            style={({ pressed }) => [
              styles.editButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Pencil
              size={18}
              color="#FFFFFF"
              strokeWidth={2.2}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.editButtonText,
                { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
              ]}
            >
              Edit transaction
            </Text>
          </Pressable>

          {/* Secondary Action Button: Delete transaction */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete transaction"
            onPress={() => setConfirm(true)}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: isDark ? "transparent" : "#FFFFFF",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Trash2
              size={18}
              color="#DC2626"
              strokeWidth={2.2}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.deleteButtonText,
                { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
              ]}
            >
              Delete transaction
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Delete Confirmation Sheet */}
      <ConfirmSheet
        visible={confirm}
        title="Delete transaction?"
        message="This removes the transaction from reports. It remains in the account audit history until account deletion."
        busy={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => remove.mutate(undefined)}
      />

      {/* More Options Modal */}
      <Modal
        visible={moreMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreMenuOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMoreMenuOpen(false)}
        >
          <View
            style={[
              styles.moreMenuSheet,
              { backgroundColor: isDark ? colors.surface : "#FFFFFF" },
            ]}
          >
            <View style={styles.sheetHandle} />

            <Pressable
              style={({ pressed }) => [
                styles.menuOptionRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => {
                setMoreMenuOpen(false);
                setEdit(transaction);
              }}
            >
              <Pencil size={20} color={colors.ink} strokeWidth={2} />
              <Text
                style={[
                  styles.menuOptionText,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                Edit transaction
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.menuOptionRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleCopyDetails}
            >
              <CopyIcon size={20} color={colors.ink} strokeWidth={2} />
              <Text
                style={[
                  styles.menuOptionText,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                Copy details
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.menuOptionRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => {
                setMoreMenuOpen(false);
                setConfirm(true);
              }}
            >
              <Trash2 size={20} color="#DC2626" strokeWidth={2} />
              <Text
                style={[
                  styles.menuOptionText,
                  {
                    color: "#DC2626",
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                Delete transaction
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.menuCancelButton,
                {
                  backgroundColor: isDark ? colors.canvas : "#F1F5F9",
                },
              ]}
              onPress={() => setMoreMenuOpen(false)}
            >
              <Text
                style={[
                  styles.menuCancelText,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  circleButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  heroCard: {
    borderRadius: 24,
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  heroIconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitleText: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 6,
  },
  heroAmountText: {
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitleText: {
    fontSize: 15,
    fontWeight: "400",
  },
  detailsCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 15,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  detailDivider: {
    height: 1,
  },
  categoryValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  smallIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  actionButtonsContainer: {
    gap: 14,
  },
  editButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#065F46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  deleteButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  moreMenuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  menuOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuCancelButton: {
    marginTop: 10,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
export function NewTransactionScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  return (
    <TransactionForm
      type={type?.toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE"}
    />
  );
}
