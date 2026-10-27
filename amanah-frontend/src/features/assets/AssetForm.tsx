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
import * as Crypto from "expo-crypto";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Banknote,
  PiggyBank,
  TrendingUp,
  Store,
  Calendar as CalendarIcon,
  Info,
  CheckCircle2,
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
import type { Asset } from "../../core/api/types";
import { localDate } from "../../core/i18n/formatters";
import { GoldBarsIcon, SilverBarsIcon } from "./AssetIcons";
import {
  date,
  currencyOptions,
  useRetryKey,
  useFormGuard,
} from "../finance/form-tools";

const schema = z.object({
  type: z.enum([
    "CASH",
    "SAVINGS",
    "GOLD",
    "SILVER",
    "INVESTMENT",
    "BUSINESS_INVENTORY",
  ]),
  label: z.string().trim().min(1).max(100),
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
  valuationMode: z.enum(["MANUAL", "METAL_RATE"]),
  declaredValue: z.string(),
  weightGrams: z.string(),
  purity: z.string(),
  valuedOn: date,
  note: z.string().max(200).optional(),
});

type Form = z.infer<typeof schema>;

const ASSET_TYPES = [
  {
    type: "CASH" as const,
    label: "Cash",
    Icon: Banknote,
    color: "#0F6E56",
    bg: "#EBF5F0",
  },
  {
    type: "SAVINGS" as const,
    label: "Savings",
    Icon: PiggyBank,
    color: "#2563EB",
    bg: "#EBF5FF",
  },
  {
    type: "GOLD" as const,
    label: "Gold",
    Icon: GoldBarsIcon,
    color: "#D97706",
    bg: "#FEF3C7",
  },
  {
    type: "SILVER" as const,
    label: "Silver",
    Icon: SilverBarsIcon,
    color: "#64748B",
    bg: "#F1F5F9",
  },
  {
    type: "INVESTMENT" as const,
    label: "Investments",
    Icon: TrendingUp,
    color: "#7C3AED",
    bg: "#F3E8FF",
  },
  {
    type: "BUSINESS_INVENTORY" as const,
    label: "Business inventory",
    Icon: Store,
    color: "#EA580C",
    bg: "#FDECEF",
  },
];

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

const WEIGHT_UNITS = [
  { label: "Grams (g)", value: "g" },
  { label: "Bhori / Vori", value: "bhori" },
  { label: "Tola", value: "tola" },
  { label: "Troy Ounce (oz)", value: "oz" },
];

export function AssetForm({
  record,
  onReload,
  onCancel,
  onSuccess,
}: {
  record?: Asset;
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
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [weightUnit, setWeightUnit] = useState("g");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteKey] = useState(Crypto.randomUUID);

  const defaultCurrency =
    (record?.currency as Form["currency"] | undefined) ??
    (account?.preferences?.currency as Form["currency"] | undefined) ??
    "BDT";

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: record?.type ?? "GOLD",
      label: record?.label ?? "Gold",
      currency: defaultCurrency,
      valuationMode: record?.valuationMode ?? "MANUAL",
      declaredValue: record?.declaredValue ?? "240,000",
      weightGrams: record?.weightGrams ?? "20",
      purity: record?.purity ?? "0.916667",
      valuedOn:
        record?.valuedOn ??
        localDate(account?.preferences?.timezone ?? "Asia/Dhaka"),
      note: "",
    },
  });

  const selectedType = form.watch("type");
  const selectedCurrency = form.watch("currency");
  const selectedDate = form.watch("valuedOn");
  const weightVal = form.watch("weightGrams");
  const noteVal = form.watch("note") || "";

  const isMetal = selectedType === "GOLD" || selectedType === "SILVER";

  useFormGuard(form.formState.isDirty && !saved);

  useEffect(() => {
    if (saved) {
      if (onSuccess) onSuccess();
      else router.replace("/assets");
    }
  }, [saved, router, onSuccess]);

  const mutation = useAccountMutation(async (v: Form) => {
    const rawValue = v.declaredValue.replaceAll(",", "").trim();
    const isMetalType = v.type === "GOLD" || v.type === "SILVER";
    const b = {
      type: v.type,
      label: v.label || v.type.replaceAll("_", " "),
      currency: v.currency,
      valuationMode:
        isMetalType && v.weightGrams
          ? ("METAL_RATE" as const)
          : ("MANUAL" as const),
      declaredValue: isMetalType && v.weightGrams ? null : rawValue,
      weightGrams: isMetalType && v.weightGrams ? v.weightGrams : null,
      purity: isMetalType && v.weightGrams ? v.purity || "0.916667" : null,
      valuedOn: v.valuedOn,
    };
    const header = { "idempotency-key": key(b) };
    return record
      ? dataOf(
          await api.PATCH("/v1/assets/{id}", {
            params: { path: { id: record.id }, header },
            body: { ...b, version: record.version },
          }),
        )
      : dataOf(await api.POST("/v1/assets", { params: { header }, body: b }));
  });

  const remove = useAccountMutation(async () => {
    if (!record) return;
    await api.DELETE("/v1/assets/{id}", {
      params: { path: { id: record.id }, header: { "idempotency-key": deleteKey } },
      headers: { "idempotency-key": deleteKey },
      body: { version: record.version },
    });
    toast("Deleted");
    if (onCancel) onCancel();
    else router.replace("/assets");
  });

  const submit = form.handleSubmit(async (v) => {
    try {
      await mutation.mutateAsync(v);
      setSaved(true);
      form.reset(v);
      toast("Saved");
    } catch {
      /* Draft remains */
    }
  });

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

  // Auto calculate estimated metal price
  const weightNum = parseFloat(weightVal) || 0;
  const ratePerGram = selectedType === "GOLD" ? 12000 : 150;
  const estimatedTotal = weightNum * ratePerGram;
  const formattedEstimate =
    estimatedTotal > 0
      ? `৳${estimatedTotal.toLocaleString()}`
      : "৳240,000";

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
              onPress={() => {
                if (onCancel) onCancel();
                else router.back();
              }}
              style={({ pressed }) => [
                styles.circleBackButton,
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
                styles.screenHeaderTitle,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {record ? "Edit asset" : "Add asset"}
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          {/* Asset Type Selection Grid */}
          <View style={styles.sectionWrapper}>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              Asset type <Text style={styles.requiredAsterisk}>*</Text>
            </Text>

            <View style={styles.typeGrid}>
              {ASSET_TYPES.map((item) => {
                const isSelected = selectedType === item.type;
                return (
                  <Pressable
                    key={item.type}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => {
                      form.setValue("type", item.type);
                      form.setValue("label", item.label);
                      if (item.type === "GOLD" && !form.getValues("declaredValue")) {
                        form.setValue("declaredValue", "240,000");
                        form.setValue("weightGrams", "20");
                      }
                    }}
                    style={({ pressed }) => [
                      styles.typeCard,
                      {
                        backgroundColor: isDark ? colors.surface : "#FFFFFF",
                        borderColor: isSelected
                          ? "#065F46"
                          : isDark
                            ? colors.border
                            : "#E2E8F0",
                        borderWidth: isSelected ? 1.5 : 1,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.typeIconBadge,
                        {
                          backgroundColor: isDark ? "#283832" : item.bg,
                        },
                      ]}
                    >
                      <item.Icon size={20} color={item.color} strokeWidth={2} />
                    </View>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.typeCardText,
                        {
                          color: colors.ink,
                          fontFamily: isSelected
                            ? locale === "bn"
                              ? "Bengali"
                              : "OutfitMedium"
                            : locale === "bn"
                              ? "Bengali"
                              : "OutfitMedium",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>

                    {isSelected ? (
                      <View style={styles.checkBadge}>
                        <CheckCircle2
                          size={18}
                          color="#065F46"
                          strokeWidth={2.4}
                        />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Card 2: Value Input */}
          <View style={styles.sectionWrapper}>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              {`Value (${selectedCurrency}) `}
              <Text style={styles.requiredAsterisk}>*</Text>
            </Text>

            <View
              style={[
                styles.amountInputRow,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: isDark ? colors.border : "#E2E8F0",
                },
              ]}
            >
              {/* Currency Selector Pill */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose currency"
                onPress={() => setCurrencyModalOpen(true)}
                style={({ pressed }) => [
                  styles.currencyPill,
                  {
                    backgroundColor: isDark ? "#283832" : "#F1F5F9",
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {`${selectedCurrency} (${currencySymbol})`}
                </Text>
                <ChevronDown size={14} color="#64748B" strokeWidth={2} />
              </Pressable>

              {/* Vertical Divider */}
              <View
                style={[
                  styles.amountDivider,
                  { backgroundColor: isDark ? colors.border : "#E2E8F0" },
                ]}
              />

              {/* Value Text Input */}
              <Controller
                control={form.control}
                name="declaredValue"
                render={({ field }) => (
                  <View style={{ flex: 1 }}>
                    <TextInput
                      accessibilityLabel="Asset value"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="240,000"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      style={[
                        styles.valueTextInput,
                        {
                          color: colors.ink,
                          fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                        },
                      ]}
                    />
                  </View>
                )}
              />
            </View>
          </View>

          {/* Weight (optional) - For Gold / Silver */}
          {isMetal ? (
            <View style={styles.sectionWrapper}>
              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                Weight (optional)
              </Text>

              <View
                style={[
                  styles.weightInputRow,
                  {
                    backgroundColor: isDark ? colors.surface : "#FFFFFF",
                    borderColor: isDark ? colors.border : "#E2E8F0",
                  },
                ]}
              >
                <Controller
                  control={form.control}
                  name="weightGrams"
                  render={({ field }) => (
                    <TextInput
                      accessibilityLabel="Weight"
                      value={field.value}
                      onChangeText={(val) => {
                        field.onChange(val);
                        const n = parseFloat(val) || 0;
                        if (n > 0) {
                          form.setValue(
                            "declaredValue",
                            (n * ratePerGram).toLocaleString(),
                          );
                        }
                      }}
                      placeholder="20"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      style={[
                        styles.weightTextInput,
                        {
                          color: colors.ink,
                          fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                        },
                      ]}
                    />
                  )}
                />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose weight unit"
                  onPress={() => setUnitModalOpen(true)}
                  style={({ pressed }) => [
                    styles.unitPill,
                    {
                      backgroundColor: isDark ? "#283832" : "#F1F5F9",
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      {
                        color: colors.ink,
                        fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                      },
                    ]}
                  >
                    {weightUnit}
                  </Text>
                  <ChevronDown size={14} color="#64748B" strokeWidth={2} />
                </Pressable>
              </View>

              {/* Estimated Value Banner Card */}
              <View
                style={[
                  styles.estimateCard,
                  {
                    backgroundColor: isDark ? "#172E24" : "#EEF7F2",
                    borderColor: isDark ? "#284A3B" : "#D8EDE1",
                  },
                ]}
              >
                <View
                  style={[
                    styles.estimateIconBadge,
                    {
                      backgroundColor: isDark ? "#382C1A" : "#FEF3C7",
                    },
                  ]}
                >
                  <GoldBarsIcon size={24} color="#D97706" />
                </View>

                <View style={styles.estimateTextCol}>
                  <Text
                    style={[
                      styles.estimateLabel,
                      { color: isDark ? "#A3D4B6" : "#4B6358" },
                    ]}
                  >
                    Estimated value from the last saved price
                  </Text>
                  <Text
                    style={[
                      styles.estimateTotalText,
                      {
                        color: isDark ? "#E1F5EE" : "#0F5132",
                        fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                      },
                    ]}
                  >
                    {formattedEstimate}
                  </Text>
                  <Text
                    style={[
                      styles.estimateSubText,
                      { color: isDark ? "#8FBFA6" : "#6B7280" },
                    ]}
                  >
                    {`Based on ৳${ratePerGram.toLocaleString()} per gram (saved price)`}
                  </Text>
                  <Text
                    style={[
                      styles.estimateDateText,
                      { color: isDark ? "#8FBFA6" : "#6B7280" },
                    ]}
                  >
                    Price updated: 20 Oct 2026, 10:30 AM
                  </Text>
                </View>

                <Info size={20} color="#0F6E56" strokeWidth={1.8} />
              </View>
            </View>
          ) : null}

          {/* As of Date Card */}
          <View style={styles.sectionWrapper}>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              As of date <Text style={styles.requiredAsterisk}>*</Text>
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose date"
              onPress={() => setDateModalOpen(true)}
              style={({ pressed }) => [
                styles.dateCard,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: isDark ? colors.border : "#E2E8F0",
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.dateCardLeft}>
                <CalendarIcon size={19} color={colors.ink} strokeWidth={1.8} />
                <Text
                  style={[
                    styles.dateCardValue,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {formatDateDisplay(selectedDate)}
                </Text>
              </View>
              <ChevronRight size={18} color="#94A3B8" strokeWidth={1.8} />
            </Pressable>
          </View>

          {/* Note (optional) Card */}
          <View style={styles.sectionWrapper}>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.ink,
                  fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                },
              ]}
            >
              Note (optional)
            </Text>

            <View
              style={[
                styles.noteBoxWrapper,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: isDark ? colors.border : "#E2E8F0",
                },
              ]}
            >
              <Controller
                control={form.control}
                name="note"
                render={({ field }) => (
                  <TextInput
                    accessibilityLabel="Note"
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="Add a note (optional)"
                    placeholderTextColor="#94A3B8"
                    multiline
                    maxLength={200}
                    style={[
                      styles.noteInput,
                      {
                        color: colors.ink,
                        fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                      },
                    ]}
                  />
                )}
              />
              <Text
                style={[
                  styles.charCountText,
                  { color: isDark ? colors.muted : "#94A3B8" },
                ]}
              >
                {`${noteVal.length}/200`}
              </Text>
            </View>
          </View>

          {mutation.error ? (
            <View style={{ marginBottom: 16 }}>
              <ErrorRetry error={mutation.error} />
            </View>
          ) : null}

          <ConflictRecovery error={mutation.error} onReload={onReload} />

          {/* Save Asset Action Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={record ? "Save changes" : "Save asset"}
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
                <Text
                  style={[
                    styles.primarySaveButtonText,
                    { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
                  ]}
                >
                  {record ? "Save changes" : "Save asset"}
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

          {/* Delete Asset Button in Edit Mode */}
          {record ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete asset"
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
              <Text
                style={[
                  styles.deleteButtonText,
                  { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
                ]}
              >
                Delete asset
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Currency Selection Modal */}
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
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                Choose currency
              </Text>
              <Pressable onPress={() => setCurrencyModalOpen(false)}>
                <X size={20} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {currencyOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    form.setValue("currency", opt.value as Form["currency"]);
                    setCurrencyModalOpen(false);
                  }}
                  style={[
                    styles.currencyOptionItem,
                    {
                      backgroundColor:
                        selectedCurrency === opt.value
                          ? isDark
                            ? "#172E24"
                            : "#E1F5EE"
                          : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyOptionLabel,
                      { color: colors.ink },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selectedCurrency === opt.value ? (
                    <Text style={{ color: "#0F6E56", fontWeight: "700" }}>
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Weight Unit Selection Modal */}
      <Modal
        visible={unitModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setUnitModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setUnitModalOpen(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? colors.surface : "#FFFFFF" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                Choose weight unit
              </Text>
              <Pressable onPress={() => setUnitModalOpen(false)}>
                <X size={20} color="#64748B" />
              </Pressable>
            </View>
            <View style={{ gap: 6, paddingVertical: 10 }}>
              {WEIGHT_UNITS.map((u) => (
                <Pressable
                  key={u.value}
                  onPress={() => {
                    setWeightUnit(u.value);
                    setUnitModalOpen(false);
                  }}
                  style={[
                    styles.currencyOptionItem,
                    {
                      backgroundColor:
                        weightUnit === u.value
                          ? isDark
                            ? "#172E24"
                            : "#E1F5EE"
                          : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[styles.currencyOptionLabel, { color: colors.ink }]}
                  >
                    {u.label}
                  </Text>
                  {weightUnit === u.value ? (
                    <Text style={{ color: "#0F6E56", fontWeight: "700" }}>
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Date Picker Modal */}
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
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? colors.surface : "#FFFFFF" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                Select as of date
              </Text>
              <Pressable onPress={() => setDateModalOpen(false)}>
                <X size={20} color="#64748B" />
              </Pressable>
            </View>
            <View style={{ gap: 12, paddingVertical: 12 }}>
              <TextInput
                value={selectedDate}
                onChangeText={(v) => form.setValue("valuedOn", v)}
                placeholder="YYYY-MM-DD"
                style={[
                  styles.dateTextInput,
                  {
                    color: colors.ink,
                    borderColor: isDark ? colors.border : "#CBD5E1",
                    backgroundColor: isDark ? colors.canvas : "#F8FAFC",
                  },
                ]}
              />
              <Pressable
                onPress={() => {
                  form.setValue(
                    "valuedOn",
                    localDate(account?.preferences?.timezone ?? "Asia/Dhaka"),
                  );
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
        title="Delete asset?"
        message="This removes the holding from your current estimate. Historical assessments remain unchanged."
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate(undefined)}
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
    flexGrow: 1,
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 8,
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
  screenHeaderTitle: {
    fontSize: 19,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  sectionWrapper: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: "#EF4444",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeCard: {
    width: "48.5%",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  typeIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  typeCardText: {
    fontSize: 14,
    flex: 1,
  },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  amountInputRow: {
    borderWidth: 1,
    borderRadius: 16,
    height: 62,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  currencyPill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currencyPillText: {
    fontSize: 14,
  },
  amountDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 10,
  },
  valueTextInput: {
    fontSize: 28,
    letterSpacing: -0.5,
    padding: 0,
  },
  weightInputRow: {
    borderWidth: 1,
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  weightTextInput: {
    fontSize: 18,
    flex: 1,
    padding: 0,
  },
  unitPill: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  unitPillText: {
    fontSize: 14,
  },
  estimateCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  estimateIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  estimateTextCol: {
    flex: 1,
  },
  estimateLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  estimateTotalText: {
    fontSize: 22,
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  estimateSubText: {
    fontSize: 12,
  },
  estimateDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  dateCard: {
    borderWidth: 1,
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dateCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateCardValue: {
    fontSize: 15,
  },
  noteBoxWrapper: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 110,
    padding: 14,
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  noteInput: {
    fontSize: 14.5,
    textAlignVertical: "top",
    minHeight: 65,
    padding: 0,
  },
  charCountText: {
    fontSize: 12,
    textAlign: "right",
  },
  primarySaveButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#065F46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 8,
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primarySaveButtonText: {
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
    backgroundColor: "#FFFFFF",
    marginTop: 12,
  },
  deleteButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  currencyOptionItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currencyOptionLabel: {
    fontSize: 15,
  },
  dateTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
  },
  todayPillButton: {
    backgroundColor: "#E1F5EE",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  todayPillText: {
    color: "#0F6E56",
    fontWeight: "600",
    fontSize: 14,
  },
  donePillButton: {
    backgroundColor: "#065F46",
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  donePillText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
