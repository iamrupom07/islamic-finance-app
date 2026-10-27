import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Crypto from "expo-crypto";
import Svg, { Path } from "react-native-svg";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Building2,
  Gift,
  TrendingUp,
  MoreHorizontal,
  ShoppingCart,
  Receipt,
  Bus,
  Heart,
  CreditCard,
  Calendar as CalendarIcon,
  Info,
  Check,
  X,
  Trash2,
} from "lucide-react-native";
import {
  ErrorRetry,
  ConflictRecovery,
  ConfirmSheet,
  useToast,
} from "../../design-system/components";
import { useAuth } from "../../core/auth/AuthProvider";
import { api, dataOf } from "../../core/api/client";
import { useAccountMutation } from "../../core/api/hooks";
import type { Transaction } from "../../core/api/types";
import { localDate } from "../../core/i18n/formatters";
import {
  positive,
  date,
  currencyOptions,
  useRetryKey,
  useFormGuard,
} from "./form-tools";

const schema = z.object({
  amount: positive,
  currency: z.string(),
  localDate: date,
  category: z.string(),
  description: z.string().max(500),
  enteredRate: z.string().optional(),
  enteredRateAt: z.string().optional(),
  isSadaqah: z.boolean(),
});

type Form = z.infer<typeof schema>;

function SadaqahGivingHandIcon({ size = 22, color = "#0F6E56" }: { size?: number; color?: string }) {
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
      <Path d="M12 4.5c1.4-1.4 3.6-1.4 5 0s1.4 3.6 0 5L12 14.5 7 9.5c-1.4-1.4-1.4-3.6 0-5s3.6-1.4 5 0z" />
      <Path d="M3 15.5l5.5-1.5 3 2.5 6.5-1.5 3 1v3.5l-4 1-5.5-1L3 18v-2.5z" />
    </Svg>
  );
}

function formatDateDisplay(isoDate: string) {
  try {
    const parts = isoDate.split("-");
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
    /* fallback to unparsed date */
  }
  return isoDate;
}

const CATEGORY_META: Record<
  string,
  { label: string; Icon: any; color: string; bg: string }
> = {
  // Income
  SALARY: { label: "Salary", Icon: Briefcase, color: "#0284C7", bg: "#EBF5FF" },
  BUSINESS: { label: "Business", Icon: Building2, color: "#0F6E56", bg: "#DCF5EC" },
  GIFT: { label: "Gift", Icon: Gift, color: "#D97706", bg: "#FEF3C7" },
  INVESTMENT_RETURN: {
    label: "Investment return",
    Icon: TrendingUp,
    color: "#7C3AED",
    bg: "#F3E8FF",
  },
  // Expense
  FOOD: {
    label: "Food & groceries",
    Icon: ShoppingCart,
    color: "#EF4444",
    bg: "#FEECEC",
  },
  BILLS: {
    label: "Bills & utilities",
    Icon: Receipt,
    color: "#2563EB",
    bg: "#EBF5FF",
  },
  TRANSPORT: {
    label: "Transport",
    Icon: Bus,
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  SADAQAH: {
    label: "Sadaqah & charity",
    Icon: Heart,
    color: "#0F6E56",
    bg: "#DCF5EC",
  },
  DEBT_REPAYMENT: {
    label: "Debt repayment",
    Icon: CreditCard,
    color: "#8B5CF6",
    bg: "#F3E8FF",
  },
  OTHER: {
    label: "Other",
    Icon: MoreHorizontal,
    color: "#64748B",
    bg: "#F1F5F3",
  },
};

const incomeCategories = [
  "SALARY",
  "BUSINESS",
  "GIFT",
  "INVESTMENT_RETURN",
  "OTHER",
];

const expenseCategories = [
  "FOOD",
  "BILLS",
  "TRANSPORT",
  "SADAQAH",
  "DEBT_REPAYMENT",
  "OTHER",
];

export function TransactionForm({
  record,
  onReload,
  onCancel,
  onSuccess,
  type = "EXPENSE",
}: {
  record?: Transaction;
  onReload?: () => Promise<void>;
  onCancel?: () => void;
  onSuccess?: () => void;
  type?: "INCOME" | "EXPENSE";
}) {
  const router = useRouter();
  const { account } = useAuth();
  const toast = useToast();
  const retryKey = useRetryKey();
  const [saved, setSaved] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteKey] = useState(Crypto.randomUUID);

  const remove = useAccountMutation(async () => {
    if (!record) return;
    await api.DELETE("/v1/transactions/{id}", {
      params: { path: { id: record.id }, header: { "idempotency-key": deleteKey } },
      headers: { "idempotency-key": deleteKey },
      body: { version: record.version },
    });
    toast("Deleted");
    if (onCancel) onCancel();
    else router.replace("/transactions");
  });

  type = record?.type ?? type;
  const isIncome = type === "INCOME";

  const defaultCategory = isIncome ? "SALARY" : "FOOD";
  const categoryList = isIncome ? incomeCategories : expenseCategories;

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: record?.amount ?? "",
      currency: record?.currency ?? account?.preferences?.currency ?? "BDT",
      localDate: record?.localDate ?? localDate(account?.preferences?.timezone ?? "Asia/Dhaka"),
      category: record?.category ?? defaultCategory,
      description: record?.description ?? "",
      isSadaqah: record?.isSadaqah ?? false,
      enteredRate: "",
      enteredRateAt: "",
    },
  });

  useFormGuard(form.formState.isDirty && !saved);

  useEffect(() => {
    if (saved) {
      if (onSuccess) onSuccess();
      else router.replace("/transactions");
    }
  }, [saved, router, onSuccess]);

  const mutation = useAccountMutation(async (v: Form) => {
    const { enteredRate, enteredRateAt, ...values } = v;
    const body = {
      ...values,
      type,
      isSadaqah:
        type === "EXPENSE" && (v.isSadaqah || v.category === "SADAQAH"),
      ...(enteredRate ? { enteredRate, enteredRateAt } : {}),
    };
    const headers = { "idempotency-key": retryKey(body) };
    if (record) {
      const changes = Object.fromEntries(
        Object.entries(body).filter(
          ([name, value]) =>
            name === "enteredRate" ||
            name === "enteredRateAt" ||
            (record as unknown as Record<string, unknown>)[name] !== value,
        ),
      );
      return dataOf(
        await api.PATCH("/v1/transactions/{id}", {
          params: { path: { id: record.id }, header: headers },
          body: { ...changes, version: record.version } as any,
          headers,
        }),
      );
    }
    return dataOf(
      await api.POST("/v1/transactions", {
        params: { header: headers },
        body: body as any,
        headers,
      }),
    );
  });

  const submit = form.handleSubmit(async (value) => {
    try {
      await mutation.mutateAsync(value);
      setSaved(true);
      form.reset(value);
      toast("Saved");
    } catch {
      /* Draft remains in the form */
    }
  });

  const selectedCurrency = form.watch("currency");
  const selectedCategory = form.watch("category");
  const selectedDate = form.watch("localDate");
  const noteValue = form.watch("description") || "";

  const categoryMeta =
    CATEGORY_META[selectedCategory] || CATEGORY_META.OTHER!;

  const currencySymbol =
    selectedCurrency === "BDT"
      ? "৳"
      : selectedCurrency === "USD"
        ? "$"
        : selectedCurrency === "EUR"
          ? "€"
          : selectedCurrency === "GBP"
            ? "£"
            : selectedCurrency;

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
          {/* Top Bar Header */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => {
                if (onCancel) onCancel();
                else router.back();
              }}
              style={({ pressed }) => [
                styles.circleBackButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ArrowLeft size={20} color="#182322" strokeWidth={2.2} />
            </Pressable>

            <Text accessibilityRole="header" style={styles.screenHeaderTitle}>
              {record
                ? "Edit transaction"
                : isIncome
                  ? "Add income"
                  : "Add expense"}
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          {/* Card 1: Amount */}
          <View style={styles.cardContainer}>
            <Text style={styles.fieldLabel}>
              Amount <Text style={styles.requiredAsterisk}>*</Text>
            </Text>

            <View style={styles.amountInputRow}>
              {/* Currency Selector Pill */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose currency"
                onPress={() => setCurrencyModalOpen(true)}
                style={({ pressed }) => [
                  isIncome ? styles.currencyPillMint : styles.currencyPillGray,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text
                  style={
                    isIncome ? styles.currencyTextMint : styles.currencyTextDark
                  }
                >
                  {isIncome
                    ? `${selectedCurrency} / ${currencySymbol}`
                    : `${selectedCurrency} (${currencySymbol})`}
                </Text>
                <ChevronDown
                  size={15}
                  color={isIncome ? "#0F6E56" : "#64748B"}
                  strokeWidth={2}
                />
              </Pressable>

              {/* Vertical Divider */}
              <View style={styles.amountDivider} />

              {/* Number Input */}
              <Controller
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <View style={{ flex: 1 }}>
                    <TextInput
                      accessibilityLabel="Amount"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder={isIncome ? "65,000" : "1,850"}
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      style={styles.amountTextInput}
                    />
                  </View>
                )}
              />
            </View>
            {form.formState.errors.amount?.message && (
              <Text style={styles.fieldErrorText}>
                {form.formState.errors.amount.message}
              </Text>
            )}
          </View>

          {/* Card 2: Details */}
          <View style={styles.cardContainer}>
            {isIncome ? (
              /* Add Income Details: Source, Date, Note */
              <>
                {/* Source Row */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose source"
                  onPress={() => setCategoryModalOpen(true)}
                  style={({ pressed }) => [
                    styles.detailRow,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircleBadge,
                      { backgroundColor: categoryMeta.bg },
                    ]}
                  >
                    <categoryMeta.Icon
                      size={20}
                      color={categoryMeta.color}
                      strokeWidth={1.9}
                    />
                  </View>
                  <View style={styles.detailTextCol}>
                    <Text style={styles.detailLabel}>Source</Text>
                    <Text style={styles.detailValue}>
                      {categoryMeta.label}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#64748B" strokeWidth={1.8} />
                </Pressable>

                <View style={styles.rowDivider} />

                {/* Date Row */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose date"
                  onPress={() => setDateModalOpen(true)}
                  style={({ pressed }) => [
                    styles.detailRow,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircleBadge,
                      { backgroundColor: "#EBF5F0" },
                    ]}
                  >
                    <CalendarIcon size={20} color="#0F6E56" strokeWidth={1.9} />
                  </View>
                  <View style={styles.detailTextCol}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {formatDateDisplay(selectedDate)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#64748B" strokeWidth={1.8} />
                </Pressable>

                <View style={styles.rowDivider} />

                {/* Note Row */}
                <View style={styles.noteSection}>
                  <Text style={styles.noteLabel}>Note (optional)</Text>
                  <Controller
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <TextInput
                        accessibilityLabel="Note"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Add a short note"
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={3}
                        style={styles.noteTextArea}
                      />
                    )}
                  />
                </View>
              </>
            ) : (
              /* Add Expense Details: Category, Date, Note */
              <>
                {/* Category Row */}
                <View style={styles.expenseFieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Category <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose category"
                    onPress={() => setCategoryModalOpen(true)}
                    style={({ pressed }) => [
                      styles.selectBox,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <View style={styles.selectBoxLeft}>
                      <View
                        style={[
                          styles.smallBadge,
                          { backgroundColor: categoryMeta.bg },
                        ]}
                      >
                        <categoryMeta.Icon
                          size={18}
                          color={categoryMeta.color}
                          strokeWidth={1.9}
                        />
                      </View>
                      <Text style={styles.selectBoxValueText}>
                        {categoryMeta.label}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" strokeWidth={1.8} />
                  </Pressable>
                </View>

                {/* Date Row */}
                <View style={styles.expenseFieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Date <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose date"
                    onPress={() => setDateModalOpen(true)}
                    style={({ pressed }) => [
                      styles.selectBox,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <View style={styles.selectBoxLeft}>
                      <CalendarIcon size={19} color="#182322" strokeWidth={1.8} />
                      <Text style={styles.selectBoxValueText}>
                        {formatDateDisplay(selectedDate)}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" strokeWidth={1.8} />
                  </Pressable>
                </View>

                {/* Note Row */}
                <View style={styles.expenseFieldGroup}>
                  <Text style={styles.fieldLabel}>Note (optional)</Text>
                  <View style={styles.noteBoxWrapper}>
                    <Controller
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <TextInput
                          accessibilityLabel="Note"
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Add a note (optional)"
                          placeholderTextColor="#94A3B8"
                          multiline
                          maxLength={200}
                          style={styles.expenseNoteInput}
                        />
                      )}
                    />
                    <Text style={styles.charCountText}>
                      {noteValue.length}/200
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Card 3: "This is sadaqah" Toggle (for Expenses) */}
          {!isIncome && (
            <View style={styles.sadaqahToggleCard}>
              <View style={styles.sadaqahToggleLeft}>
                <View style={styles.sadaqahIconCircle}>
                  <SadaqahGivingHandIcon size={20} color="#0F6E56" />
                </View>
                <View style={styles.sadaqahToggleTextCol}>
                  <Text style={styles.sadaqahToggleTitle}>This is sadaqah</Text>
                  <Text style={styles.sadaqahToggleSub}>
                    Include this in your sadaqah records
                  </Text>
                </View>
              </View>

              <Controller
                control={form.control}
                name="isSadaqah"
                render={({ field }) => (
                  <Switch
                    accessibilityLabel="Sadaqah expense"
                    value={field.value}
                    onValueChange={field.onChange}
                    trackColor={{ false: "#D1D5DB", true: "#0F6E56" }}
                    thumbColor="#FFFFFF"
                  />
                )}
              />
            </View>
          )}

          {/* Foreign Currency Conversion Rates (if needed) */}
          {selectedCurrency !== account?.preferences?.currency && (
            <View style={styles.conversionCard}>
              <Text style={styles.conversionInfo}>
                For a backdated entry, supply a rate into your display currency
                and its source timestamp.
              </Text>
              <Controller
                control={form.control}
                name="enteredRate"
                render={({ field }) => (
                  <TextInput
                    accessibilityLabel="Entered conversion rate"
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="Rate (e.g. 1.0)"
                    keyboardType="decimal-pad"
                    style={styles.conversionInput}
                  />
                )}
              />
            </View>
          )}

          {/* Info Banner Card */}
          <View style={styles.infoBannerCard}>
            <Info size={20} color="#0F6E56" strokeWidth={1.8} style={{ marginTop: 1 }} />
            <Text style={styles.infoBannerText}>
              {record
                ? "Changes update your finance overview, category spending and sadaqah records."
                : isIncome
                  ? "Recorded income helps keep your finance overview up to date; zakat depends on eligible assets and debts."
                  : "This expense will be included in your finance overview. Marking it as sadaqah will also add it to your sadaqah records."}
            </Text>
          </View>

          {mutation.error ? (
            <View style={{ marginBottom: 16 }}>
              <ErrorRetry error={mutation.error} />
            </View>
          ) : null}

          <ConflictRecovery error={mutation.error} onReload={onReload} />

          {/* Bottom Action Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              record
                ? "Save changes"
                : isIncome
                  ? "Save income"
                  : "Save expense"
            }
            disabled={mutation.isPending}
            onPress={() => {
              void submit();
            }}
            style={({ pressed }) => [
              styles.primarySaveButton,
              { opacity: mutation.isPending || pressed ? 0.8 : 1 },
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonInnerRow}>
                <Text style={styles.primarySaveButtonText}>
                  {record
                    ? "Save changes"
                    : isIncome
                      ? "Save income"
                      : "Save expense"}
                </Text>
                <ArrowRight
                  size={18}
                  color="#FFFFFF"
                  strokeWidth={2.2}
                  style={{ marginLeft: 8 }}
                />
              </View>
            )}
          </Pressable>

          {/* Secondary Delete Button in Edit Mode */}
          {record ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete transaction"
              disabled={remove.isPending}
              onPress={() => setConfirmDelete(true)}
              style={({ pressed }) => [
                styles.deleteButton,
                { opacity: remove.isPending || pressed ? 0.75 : 1 },
              ]}
            >
              <Trash2
                size={18}
                color="#DC2626"
                strokeWidth={2.2}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.deleteButtonText}>Delete transaction</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency Selection Modal Sheet */}
      <Modal
        visible={currencyModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCurrencyModalOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose currency</Text>
              <Pressable
                onPress={() => setCurrencyModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {currencyOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    form.setValue("currency", opt.value);
                    setCurrencyModalOpen(false);
                  }}
                  style={styles.modalOptionRow}
                >
                  <Text style={styles.modalOptionText}>{opt.label}</Text>
                  {selectedCurrency === opt.value && (
                    <Check size={18} color="#0F6E56" strokeWidth={2.4} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Category Selection Modal Sheet */}
      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCategoryModalOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isIncome ? "Choose source" : "Choose category"}
              </Text>
              <Pressable
                onPress={() => setCategoryModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {categoryList.map((catKey) => {
                const meta = CATEGORY_META[catKey] || CATEGORY_META.OTHER!;
                const isSelected = selectedCategory === catKey;
                return (
                  <Pressable
                    key={catKey}
                    onPress={() => {
                      form.setValue("category", catKey);
                      setCategoryModalOpen(false);
                    }}
                    style={styles.modalOptionRow}
                  >
                    <View style={styles.modalOptionLeft}>
                      <View
                        style={[
                          styles.smallBadge,
                          { backgroundColor: meta.bg },
                        ]}
                      >
                        <meta.Icon
                          size={18}
                          color={meta.color}
                          strokeWidth={1.9}
                        />
                      </View>
                      <Text style={styles.modalOptionText}>{meta.label}</Text>
                    </View>
                    {isSelected && (
                      <Check size={18} color="#0F6E56" strokeWidth={2.4} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Date Quick Selection Modal Sheet */}
      <Modal
        visible={dateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDateModalOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select date</Text>
              <Pressable
                onPress={() => setDateModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>
            <View style={{ gap: 10, paddingVertical: 10 }}>
              <TextInput
                value={selectedDate}
                onChangeText={(v) => form.setValue("localDate", v)}
                placeholder="YYYY-MM-DD"
                style={styles.dateTextInput}
              />
              <Pressable
                onPress={() => {
                  form.setValue("localDate", localDate(account?.preferences?.timezone ?? "Asia/Dhaka"));
                  setDateModalOpen(false);
                }}
                style={styles.todayPillButton}
              >
                <Text style={styles.todayPillText}>Set to Today</Text>
              </Pressable>
              <Pressable
                onPress={() => setDateModalOpen(false)}
                style={styles.donePillButton}
              >
                <Text style={styles.donePillText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Sheet */}
      <ConfirmSheet
        visible={confirmDelete}
        title="Delete transaction?"
        message="This removes the transaction from reports. It remains in the account audit history until account deletion."
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate(undefined)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginTop: 12,
  },
  deleteButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "OutfitMedium",
  },
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
    marginBottom: 14,
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
  screenHeaderTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 18,
    color: "#111827",
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  cardContainer: {
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
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#182322",
    marginBottom: 10,
  },
  requiredAsterisk: {
    color: "#EF4444",
  },
  amountInputRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  currencyPillMint: {
    backgroundColor: "#E1F5EE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currencyPillGray: {
    backgroundColor: "#EEF6F2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currencyTextMint: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#0F6E56",
  },
  currencyTextDark: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#182322",
  },
  amountDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  amountTextInput: {
    fontSize: 28,
    fontFamily: "OutfitMedium",
    color: "#111827",
    paddingVertical: 0,
    height: "100%",
  },
  fieldErrorText: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
    marginLeft: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  iconCircleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTextCol: {
    marginLeft: 14,
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
  },
  detailValue: {
    fontFamily: "OutfitMedium",
    fontSize: 15.5,
    color: "#111827",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F3",
    marginVertical: 4,
  },
  noteSection: {
    marginTop: 10,
  },
  noteLabel: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#182322",
    marginBottom: 8,
  },
  noteTextArea: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    minHeight: 88,
    padding: 12,
    fontSize: 14.5,
    fontFamily: "Outfit",
    color: "#182322",
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
  },
  expenseFieldGroup: {
    marginBottom: 16,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  selectBoxLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  smallBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  selectBoxValueText: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
    color: "#182322",
  },
  noteBoxWrapper: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    minHeight: 96,
    padding: 12,
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  expenseNoteInput: {
    fontSize: 14.5,
    fontFamily: "Outfit",
    color: "#182322",
    textAlignVertical: "top",
    minHeight: 60,
    padding: 0,
  },
  charCountText: {
    fontFamily: "Outfit",
    fontSize: 11,
    color: "#94A3B8",
    alignSelf: "flex-end",
  },
  sadaqahToggleCard: {
    backgroundColor: "#EEF8F1",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D7ECE0",
  },
  sadaqahToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sadaqahIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D6F2E3",
    alignItems: "center",
    justifyContent: "center",
  },
  sadaqahToggleTextCol: {
    flex: 1,
    gap: 2,
  },
  sadaqahToggleTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 14.5,
    color: "#182322",
  },
  sadaqahToggleSub: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#5B6F68",
  },
  infoBannerCard: {
    backgroundColor: "#EAF6F0",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 24,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: "Outfit",
    fontSize: 12.5,
    lineHeight: 18,
    color: "#2D554A",
  },
  primarySaveButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0F6E56",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F6E56",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primarySaveButtonText: {
    fontFamily: "OutfitMedium",
    fontSize: 16,
    color: "#FFFFFF",
  },
  conversionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  conversionInfo: {
    fontFamily: "Outfit",
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  conversionInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F3",
  },
  modalTitle: {
    fontFamily: "OutfitMedium",
    fontSize: 17,
    color: "#182322",
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  modalOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalOptionText: {
    fontFamily: "OutfitMedium",
    fontSize: 15,
    color: "#182322",
  },
  dateTextInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: "Outfit",
  },
  todayPillButton: {
    backgroundColor: "#E1F5EE",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  todayPillText: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#0F6E56",
  },
  donePillButton: {
    backgroundColor: "#0F6E56",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  donePillText: {
    fontFamily: "OutfitMedium",
    fontSize: 14,
    color: "#FFFFFF",
  },
});
