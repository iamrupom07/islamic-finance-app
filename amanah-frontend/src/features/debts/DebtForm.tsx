import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Decimal } from "decimal.js";
import * as Crypto from "expo-crypto";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  Info,
  Trash2,
  X,
} from "lucide-react-native";
import {
  ErrorRetry,
  ConflictRecovery,
  ConfirmSheet,
  useToast,
} from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
import { api, dataOf } from "../../core/api/client";
import { useAccountMutation } from "../../core/api/hooks";
import { useAuth } from "../../core/auth/AuthProvider";
import type { Debt } from "../../core/api/types";
import {
  positive,
  zeroOrPositive,
  date,
  currencyOptions,
  useRetryKey,
  useFormGuard,
} from "../finance/form-tools";

const schema = z
  .object({
    direction: z.enum(["I_OWE", "OWED_TO_ME"]),
    label: z.string().trim().min(1, "Person or organization is required").max(100),
    originalAmount: positive,
    remainingAmount: zeroOrPositive,
    currency: z.enum([
      "BDT",
      "USD",
      "EUR",
      "GBP",
      "SAR",
      "AED",
      "INR",
      "MYR",
      "CAD",
      "AUD",
    ]),
    openedOn: date,
    dueOn: z.union([date, z.literal("")]),
    recoverability: z.enum(["RECOVERABLE", "UNCERTAIN", "DISPUTED"]),
    note: z.string().max(200).optional(),
  })
  .superRefine((v, c) => {
    if (new Decimal(v.remainingAmount).gt(v.originalAmount)) {
      c.addIssue({
        code: "custom",
        path: ["remainingAmount"],
        message: "Cannot exceed original amount.",
      });
    }
  });

type Form = z.infer<typeof schema>;

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return "";
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
    /* fallback */
  }
  return isoDate;
}

export function DebtForm({
  record,
  onReload,
  onCancel,
  onSuccess,
}: {
  record?: Debt;
  onReload?: () => Promise<void>;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const { account } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const key = useRetryKey();
  const { colors, dark: isDark, locale } = useTheme();
  const insets = useSafeAreaInsets();

  const [saved, setSaved] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [recordedDateModalOpen, setRecordedDateModalOpen] = useState(false);
  const [dueDateModalOpen, setDueDateModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteKey] = useState(Crypto.randomUUID);

  const defaultCurrency =
    (record?.currency as Form["currency"] | undefined) ??
    (account?.preferences?.currency as Form["currency"] | undefined) ??
    "BDT";

  const defaultDirection = record?.direction ?? "I_OWE";
  const defaultLabel = record?.label ?? (defaultDirection === "I_OWE" ? "Family member" : "Colleague");
  const defaultAmount = record ? String(record.originalAmount) : "20000";
  const defaultOpenedOn = record?.openedOn ?? "2026-10-26";
  const defaultDueOn = record?.dueOn ?? "2026-12-20";
  const defaultNote = (record as unknown as { note?: string })?.note ?? "Borrowed for family expense";

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      direction: defaultDirection,
      label: defaultLabel,
      originalAmount: defaultAmount,
      remainingAmount: record?.remainingAmount ?? defaultAmount,
      currency: defaultCurrency,
      openedOn: defaultOpenedOn,
      dueOn: defaultDueOn,
      recoverability: record?.recoverability ?? "RECOVERABLE",
      note: defaultNote,
    },
  });

  const selectedDirection = form.watch("direction");
  const selectedCurrency = form.watch("currency");
  const selectedRecordedDate = form.watch("openedOn");
  const selectedDueDate = form.watch("dueOn");
  const noteVal = form.watch("note") || "";

  useFormGuard(form.formState.isDirty && !saved);

  useEffect(() => {
    if (saved) {
      if (onSuccess) onSuccess();
      else router.replace("/debts");
    }
  }, [saved, router, onSuccess]);

  const mutation = useAccountMutation(async (v: Form) => {
    const rawAmount = v.originalAmount.replaceAll(",", "").trim();
    const b = {
      direction: v.direction,
      label: v.label.trim(),
      originalAmount: rawAmount,
      remainingAmount: rawAmount,
      currency: v.currency,
      openedOn: v.openedOn,
      dueOn: v.dueOn || null,
      recoverability: v.recoverability,
    };
    const header = { "idempotency-key": key(b) };
    return record
      ? dataOf(
          await api.PATCH("/v1/debts/{id}", {
            params: { path: { id: record.id }, header },
            body: { ...b, version: record.version },
          }),
        )
      : dataOf(await api.POST("/v1/debts", { params: { header }, body: b }));
  });

  const deleteMutation = useAccountMutation(async () => {
    if (record) {
      await api.DELETE("/v1/debts/{id}", {
        params: {
          path: { id: record.id },
          header: { "idempotency-key": deleteKey },
        },
        body: { version: record.version },
      });
    }
    toast("Debt deleted");
    if (onCancel) onCancel();
    else router.replace("/debts");
  });

  const handleBack = () => {
    if (onCancel) onCancel();
    else router.back();
  };

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? colors.canvas : "#F8FAFC" },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 28, 48) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar Header */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={handleBack}
              style={({ pressed }) => [
                styles.circleBackButton,
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
                styles.headerTitle,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {record ? "Edit debt" : "Add debt"}
            </Text>

            <View style={styles.topBarSpacer} />
          </View>

          {/* Segmented Direction Toggle: I owe vs Owed to me (Image 2) */}
          <View
            style={[
              styles.segmentedContainer,
              {
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderColor: isDark ? "#334155" : "#E2E8F0",
              },
            ]}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="I owe"
              accessibilityState={{ selected: selectedDirection === "I_OWE" }}
              onPress={() => form.setValue("direction", "I_OWE", { shouldDirty: true })}
              style={[
                styles.segmentedTab,
                selectedDirection === "I_OWE" && styles.segmentedTabActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  selectedDirection === "I_OWE"
                    ? styles.segmentedTabTextActive
                    : { color: isDark ? "#94A3B8" : "#475569" },
                ]}
              >
                I owe
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Owed to me"
              accessibilityState={{ selected: selectedDirection === "OWED_TO_ME" }}
              onPress={() => form.setValue("direction", "OWED_TO_ME", { shouldDirty: true })}
              style={[
                styles.segmentedTab,
                selectedDirection === "OWED_TO_ME" && styles.segmentedTabActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  selectedDirection === "OWED_TO_ME"
                    ? styles.segmentedTabTextActive
                    : { color: isDark ? "#94A3B8" : "#475569" },
                ]}
              >
                Owed to me
              </Text>
            </Pressable>
          </View>

          {/* Amount Card (Image 2) */}
          <Text style={[styles.fieldLabel, { color: colors.ink }]}>
            Amount ({selectedCurrency}) <Text style={styles.requiredStar}>*</Text>
          </Text>

          <View
            style={[
              styles.amountInputCard,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: form.formState.errors.originalAmount
                  ? "#EF4444"
                  : isDark
                    ? colors.border
                    : "#F1F5F9",
              },
            ]}
          >
            {/* Currency Pill Dropdown */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Currency: ${selectedCurrency}`}
              onPress={() => setCurrencyModalOpen(true)}
              style={({ pressed }) => [
                styles.currencyDropdownPill,
                {
                  backgroundColor: isDark ? "#172E24" : "#EBF5F0",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={styles.currencyDropdownText}>
                {selectedCurrency} ({selectedCurrency === "BDT" ? "৳" : "$"})
              </Text>
              <ChevronDown size={16} color="#0F6E56" strokeWidth={2.2} />
            </Pressable>

            <View
              style={[
                styles.amountDivider,
                { backgroundColor: isDark ? colors.border : "#E2E8F0" },
              ]}
            />

            {/* Large Amount Input */}
            <Controller
              control={form.control}
              name="originalAmount"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9.]/g, "");
                    field.onChange(cleaned);
                    form.setValue("remainingAmount", cleaned);
                  }}
                  placeholder="0"
                  placeholderTextColor={isDark ? "#4B5563" : "#94A3B8"}
                  keyboardType="decimal-pad"
                  style={[
                    styles.amountTextInput,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                />
              )}
            />
          </View>

          {form.formState.errors.originalAmount ? (
            <Text style={styles.errorText}>
              {form.formState.errors.originalAmount.message}
            </Text>
          ) : null}

          {/* Person or Organization * (Image 2) */}
          <Text style={[styles.fieldLabel, { color: colors.ink, marginTop: 18 }]}>
            Person or organization <Text style={styles.requiredStar}>*</Text>
          </Text>

          <Controller
            control={form.control}
            name="label"
            render={({ field }) => (
              <View
                style={[
                  styles.personCard,
                  {
                    backgroundColor: isDark ? colors.surface : "#FFFFFF",
                    borderColor: form.formState.errors.label
                      ? "#EF4444"
                      : isDark
                        ? colors.border
                        : "#F1F5F9",
                  },
                ]}
              >
                <View style={styles.personIconCircle}>
                  <User size={20} color="#0F6E56" strokeWidth={2.2} />
                </View>

                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="e.g. Family member, John Doe"
                  placeholderTextColor={isDark ? "#4B5563" : "#94A3B8"}
                  style={[
                    styles.personTextInput,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                />

                <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
              </View>
            )}
          />

          {form.formState.errors.label ? (
            <Text style={styles.errorText}>
              {form.formState.errors.label.message}
            </Text>
          ) : null}

          {/* Recorded Date * (Image 2) */}
          <Text style={[styles.fieldLabel, { color: colors.ink, marginTop: 18 }]}>
            Recorded date <Text style={styles.requiredStar}>*</Text>
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recorded date"
            onPress={() => setRecordedDateModalOpen(true)}
            style={({ pressed }) => [
              styles.datePickerCard,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: isDark ? colors.border : "#F1F5F9",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.datePickerLeft}>
              <CalendarIcon size={20} color={colors.ink} strokeWidth={2} />
              <Text
                style={[
                  styles.datePickerText,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                {formatDateDisplay(selectedRecordedDate)}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
          </Pressable>

          {/* Expected Settlement Date (optional) (Image 2) */}
          <Text style={[styles.fieldLabel, { color: colors.ink, marginTop: 18 }]}>
            Expected settlement date (optional)
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Expected settlement date"
            onPress={() => setDueDateModalOpen(true)}
            style={({ pressed }) => [
              styles.datePickerCard,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: isDark ? colors.border : "#F1F5F9",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.datePickerLeft}>
              <CalendarIcon size={20} color={colors.ink} strokeWidth={2} />
              <Text
                style={[
                  styles.datePickerText,
                  {
                    color: selectedDueDate ? colors.ink : (isDark ? "#94A3B8" : "#64748B"),
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                {selectedDueDate ? formatDateDisplay(selectedDueDate) : "Select date"}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
          </Pressable>

          {/* Note (optional) (Image 2) */}
          <Text style={[styles.fieldLabel, { color: colors.ink, marginTop: 18 }]}>
            Note (optional)
          </Text>

          <Controller
            control={form.control}
            name="note"
            render={({ field }) => (
              <View
                style={[
                  styles.noteCard,
                  {
                    backgroundColor: isDark ? colors.surface : "#FFFFFF",
                    borderColor: isDark ? colors.border : "#F1F5F9",
                  },
                ]}
              >
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={isDark ? "#4B5563" : "#94A3B8"}
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                  style={[
                    styles.noteTextInput,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitRegular",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.characterCounter,
                    { color: isDark ? "#94A3B8" : "#94A3B8" },
                  ]}
                >
                  {noteVal.length}/200
                </Text>
              </View>
            )}
          />

          {/* Info Notice Banner (Image 2) */}
          <View
            style={[
              styles.infoBannerCard,
              {
                backgroundColor: isDark ? "#172E24" : "#EBF5F0",
                borderColor: isDark ? "#284A3B" : "#D8EDE1",
              },
            ]}
          >
            <Info size={20} color="#0F6E56" strokeWidth={2.2} style={{ marginTop: 2, marginRight: 12 }} />
            <Text
              style={[
                styles.infoBannerText,
                { color: isDark ? "#A3D4B6" : "#335C4D" },
              ]}
            >
              Eligible short-term debts may affect your zakat estimate depending on your settings. Amanah provides an estimate, not a religious ruling.
            </Text>
          </View>

          {mutation.error ? <ErrorRetry error={mutation.error} /> : null}
          <ConflictRecovery error={mutation.error} onReload={onReload} />

          {/* Primary Save Button (Image 2) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save debt"
            disabled={mutation.isPending}
            onPress={() => {
              void form.handleSubmit(async (v) => {
                try {
                  await mutation.mutateAsync(v);
                  form.reset(v);
                  setSaved(true);
                  toast("Debt saved");
                } catch {
                  /* Keep draft */
                }
              })();
            }}
            style={({ pressed }) => [
              styles.primarySaveButton,
              { opacity: pressed || mutation.isPending ? 0.8 : 1 },
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text
                  style={[
                    styles.primarySaveButtonText,
                    { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
                  ]}
                >
                  Save debt
                </Text>
                <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.2} style={{ marginLeft: 8 }} />
              </>
            )}
          </Pressable>

          {/* Delete Button in Edit Mode */}
          {record ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete debt"
              onPress={() => setConfirmDelete(true)}
              style={({ pressed }) => [
                styles.deleteButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Trash2 size={18} color="#EF4444" strokeWidth={2} style={{ marginRight: 8 }} />
              <Text
                style={[
                  styles.deleteButtonText,
                  { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
                ]}
              >
                Delete debt
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency Modal */}
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
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? colors.surface : "#FFFFFF" },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeaderTitle, { color: colors.ink }]}>
                Select currency
              </Text>
              <Pressable onPress={() => setCurrencyModalOpen(false)}>
                <X size={20} color={colors.ink} />
              </Pressable>
            </View>

            {currencyOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  form.setValue("currency", opt.value as Form["currency"], {
                    shouldDirty: true,
                  });
                  setCurrencyModalOpen(false);
                }}
                style={[
                  styles.modalItemRow,
                  selectedCurrency === opt.value && {
                    backgroundColor: isDark ? "#172E24" : "#EBF5F0",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    {
                      color:
                        selectedCurrency === opt.value ? "#0F6E56" : colors.ink,
                      fontWeight: selectedCurrency === opt.value ? "700" : "500",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Recorded Date Picker Modal */}
      <Modal
        visible={recordedDateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRecordedDateModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setRecordedDateModalOpen(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? colors.surface : "#FFFFFF" },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeaderTitle, { color: colors.ink }]}>
                Choose recorded date
              </Text>
              <Pressable onPress={() => setRecordedDateModalOpen(false)}>
                <X size={20} color={colors.ink} />
              </Pressable>
            </View>

            {["2026-10-26", "2026-10-25", "2026-10-20", "2026-10-15"].map((dStr) => (
              <Pressable
                key={dStr}
                onPress={() => {
                  form.setValue("openedOn", dStr, { shouldDirty: true });
                  setRecordedDateModalOpen(false);
                }}
                style={[
                  styles.modalItemRow,
                  selectedRecordedDate === dStr && {
                    backgroundColor: isDark ? "#172E24" : "#EBF5F0",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    {
                      color: selectedRecordedDate === dStr ? "#0F6E56" : colors.ink,
                      fontWeight: selectedRecordedDate === dStr ? "700" : "500",
                    },
                  ]}
                >
                  {formatDateDisplay(dStr)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Due Date Picker Modal */}
      <Modal
        visible={dueDateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDueDateModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDueDateModalOpen(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? colors.surface : "#FFFFFF" },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeaderTitle, { color: colors.ink }]}>
                Choose settlement date
              </Text>
              <Pressable onPress={() => setDueDateModalOpen(false)}>
                <X size={20} color={colors.ink} />
              </Pressable>
            </View>

            {["2026-11-15", "2026-11-30", "2026-12-20", "2027-01-15"].map((dStr) => (
              <Pressable
                key={dStr}
                onPress={() => {
                  form.setValue("dueOn", dStr, { shouldDirty: true });
                  setDueDateModalOpen(false);
                }}
                style={[
                  styles.modalItemRow,
                  selectedDueDate === dStr && {
                    backgroundColor: isDark ? "#172E24" : "#EBF5F0",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    {
                      color: selectedDueDate === dStr ? "#0F6E56" : colors.ink,
                      fontWeight: selectedDueDate === dStr ? "700" : "500",
                    },
                  ]}
                >
                  {formatDateDisplay(dStr)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmSheet
        visible={confirmDelete}
        title="Delete debt?"
        message="This removes the debt record from your account."
        busy={deleteMutation.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate(undefined)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  circleBackButton: {
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
    fontSize: 20,
    fontWeight: "700",
  },
  topBarSpacer: {
    width: 44,
  },
  segmentedContainer: {
    flexDirection: "row",
    borderRadius: 30,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  requiredStar: {
    color: "#EF4444",
  },
  amountInputCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  currencyDropdownPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  currencyDropdownText: {
    color: "#0F6E56",
    fontSize: 14,
    fontWeight: "700",
  },
  amountDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 14,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "700",
    padding: 0,
  },
  personCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  personIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EBF5F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  personTextInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  datePickerCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  datePickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  datePickerText: {
    fontSize: 16,
  },
  noteCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  noteTextInput: {
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  characterCounter: {
    alignSelf: "flex-end",
    fontSize: 12,
    marginTop: 4,
  },
  infoBannerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 18,
    marginBottom: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  primarySaveButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#065F46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primarySaveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteButton: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalItemRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalItemText: {
    fontSize: 16,
  },
});
