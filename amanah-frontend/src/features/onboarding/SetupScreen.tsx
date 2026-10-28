import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  CheckCircle2,
} from "lucide-react-native";
import {
  Screen,
  Copy,
  Card,
  Button,
  Choice,
  Field,
  ErrorRetry,
  QueryState,
} from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
import { useAuth } from "../../core/auth/AuthProvider";
import { api, dataOf } from "../../core/api/client";
import type { Preferences } from "../../core/api/types";
import { useToast } from "../../design-system/components";
export function SetupScreen({
  step,
}: {
  step: "permissions" | "city" | "currency" | "nisab" | "prayer";
}) {
  const auth = useAuth();
  const p = auth.account!.preferences;
  const router = useRouter();
  const toast = useToast();
  const [policy, setPolicy] = useState(p.policyVersionId ?? "");
  const [currency, setCurrency] = useState(p.currency);
  const [standard, setStandard] = useState(p.nisabStandard);
  const [city, setCity] = useState(p.cityId);
  const [method, setMethod] = useState(p.methodId);
  const [school, setSchool] = useState(p.school as 0 | 1);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [permission, setPermission] = useState("");
  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => dataOf(await api.GET("/v1/catalog")),
  });
  useEffect(() => {
    const firstPolicy = catalog.data?.policies?.[0];
    if (!policy && firstPolicy) {
      setPolicy(firstPolicy.id);
    }
  }, [catalog.data?.policies, policy]);
  const save = async (
    changes: Partial<Preferences> & { completeSetup?: boolean },
    next: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      await api.PATCH("/v1/me/preferences", {
        body: { version: auth.account!.preferences.version, ...changes } as any,
      });
      await auth.reload();
      toast("Saved");
      router.replace(next as any);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const locate = async () => {
    try {
      const allowed = await Location.requestForegroundPermissionsAsync();
      if (!allowed.granted) {
        setPermission("Location was declined. Choose your city manually.");
        return;
      }
      const l = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
      });
      const nearest = catalog.data?.cities.reduce(
        (best, c) => {
          const distance =
            (c.latitude - l.coords.latitude) ** 2 +
            (c.longitude - l.coords.longitude) ** 2;
          return !best || distance < best.distance
            ? { id: c.id, distance }
            : best;
        },
        null as { id: string; distance: number } | null,
      );
      if (nearest) {
        setCity(nearest.id);
        setPermission("Nearby city selected. Please confirm it.");
      }
    } catch (e) {
      setError(e);
    }
  };
  if (step === "currency") {
    return (
      <CurrencySetupView
        selectedCurrency={currency}
        busy={busy}
        onSelectCurrency={setCurrency}
        onBack={() => router.back()}
        onContinue={(cur) => {
          setCurrency(cur);
          void save({ currency: cur, setupStep: 1 }, "/nisab");
        }}
      />
    );
  }

  const title = {
    permissions: "Permission is optional",
    city: "Choose a city",
    currency: "Choose currency",
    nisab: "Choose your nisab standard",
    prayer: "Prayer settings",
  }[step];
  return (
    <Screen title={title} back>
      {error ? <ErrorRetry error={error} /> : null}
      <QueryState query={catalog}>
        {catalog.data ? (
          <>
            {step === "permissions" ? (
              <>
                <Card>
                  <Copy>
                    Use a nearby city for prayer times, or select one manually.
                    Denying permission will not block Amanah.
                  </Copy>
                  <Button
                    secondary
                    label="Use approximate location"
                    onPress={() => {
                      void locate();
                    }}
                  />
                  <Button
                    secondary
                    label="Allow notifications"
                    onPress={() => {
                      void Notifications.requestPermissionsAsync()
                        .then((p) =>
                          setPermission(
                            p.granted
                              ? "Reminders are allowed. Choose prayer reminders in settings."
                              : "Notifications are off. You can enable them in device settings.",
                          ),
                        )
                        .catch(setError);
                    }}
                  />
                </Card>
                {permission ? <Copy>{permission}</Copy> : null}
                <Button
                  secondary
                  label="Manual city selection"
                  onPress={() => router.push("/city")}
                />
                <Button
                  label="Continue"
                  busy={busy}
                  onPress={() => {
                    void save({ cityId: city }, "/currency");
                  }}
                />
              </>
            ) : null}
            {step === "city" ? (
              <>
                <Field label="Search" value={search} onChangeText={setSearch} />
                <Choice
                  label="City"
                  value={city}
                  options={catalog.data.cities
                    .filter((c) =>
                      c.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((c) => ({ value: c.id, label: c.name }))}
                  onChange={setCity}
                />
                <Copy muted>
                  Only city-level selection is saved. No street address or
                  precise device location is stored.
                </Copy>
                <Button
                  label="Save"
                  busy={busy}
                  onPress={() => {
                    void save(
                      { cityId: city },
                      p.setupCompletedAt
                        ? "/settings/location"
                        : "/permissions",
                    );
                  }}
                />
              </>
            ) : null}
            {step === "nisab" ? (
              <>
                <Copy muted>2 / 3</Copy>
                <Card>
                  <Choice
                    label="Nisab standard"
                    value={standard}
                    options={[
                      { label: "Silver", value: "SILVER" as const },
                      { label: "Gold", value: "GOLD" as const },
                    ]}
                    onChange={setStandard}
                  />
                  <Copy muted>
                    The selected reviewed policy defines the exact grams and
                    treatment rules. Ask an advisor which method suits your
                    circumstances.
                  </Copy>
                  {catalog.data.policies.length ? (
                    <Choice
                      label="Reviewed policy"
                      value={policy}
                      options={catalog.data.policies.map((p) => ({
                        value: p.id,
                        label: p.version,
                      }))}
                      onChange={setPolicy}
                    />
                  ) : null}
                  {policy ? (
                    <Copy muted>
                      {
                        catalog.data.policies.find((p) => p.id === policy)
                          ?.sourceNotes
                      }
                    </Copy>
                  ) : null}
                  {!catalog.data.policies.length ? (
                    <Copy muted>
                      No reviewed calculation policy has been installed yet. You
                      can track finances while the estimate remains unavailable.
                    </Copy>
                  ) : null}
                </Card>
                <Button
                  label="Continue"
                  busy={busy}
                  onPress={() => {
                    void save(
                      {
                        nisabStandard: standard,
                        setupStep: 2,
                        ...(policy ? { policyVersionId: policy } : {}),
                      },
                      "/prayer-preferences",
                    );
                  }}
                />
              </>
            ) : null}
            {step === "prayer" ? (
              <>
                <Copy muted>3 / 3</Copy>
                <Card>
                  <Choice
                    label="City"
                    value={city}
                    options={catalog.data.cities.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    onChange={setCity}
                  />
                  <Choice
                    label="Method"
                    value={method}
                    options={catalog.data.methods.map((m) => ({
                      value: m.id,
                      label: m.name,
                    }))}
                    onChange={setMethod}
                  />
                  <Choice
                    label="School"
                    value={school}
                    options={[
                      { label: "Standard", value: 0 },
                      { label: "Hanafi", value: 1 },
                    ]}
                    onChange={setSchool}
                  />
                  <Copy muted>
                    Calculated times can differ from your local mosque.
                  </Copy>
                </Card>
                <Button
                  label="Finish setup"
                  busy={busy}
                  onPress={() => {
                    void save(
                      {
                        cityId: city,
                        methodId: method,
                        school,
                        completeSetup: true,
                      },
                      "/",
                    );
                  }}
                />
              </>
            ) : null}
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}

const CURRENCY_OPTIONS = [
  { code: "BDT", name: "Bangladeshi taka", symbol: "৳" },
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "GBP", name: "Pound sterling", symbol: "£" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "SAR", name: "Saudi riyal", symbol: "﷼" },
  { code: "AED", name: "UAE dirham", symbol: "د.إ" },
  { code: "INR", name: "Indian rupee", symbol: "₹" },
  { code: "MYR", name: "Malaysian ringgit", symbol: "RM" },
  { code: "CAD", name: "Canadian dollar", symbol: "C$" },
  { code: "AUD", name: "Australian dollar", symbol: "A$" },
];

function CurrencySetupView({
  selectedCurrency,
  busy,
  onSelectCurrency,
  onBack,
  onContinue,
}: {
  selectedCurrency: string;
  busy: boolean;
  onSelectCurrency: (c: any) => void;
  onBack: () => void;
  onContinue: (c: any) => void;
}) {
  const { colors, dark: isDark, locale } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState(selectedCurrency || "BDT");
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const filteredCurrencies = CURRENCY_OPTIONS.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.includes(search),
  );

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[
        currencyStyles.container,
        { backgroundColor: isDark ? colors.canvas : "#F8FAFC" },
      ]}
    >
      {/* Top Header: Back Button & 1 of 3 Progress Indicator (Image 5) */}
      <View style={currencyStyles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={({ pressed }) => [
            currencyStyles.circleButton,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#F1F5F9",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <ArrowLeft size={20} color={colors.ink} strokeWidth={2.2} />
        </Pressable>

        <View style={currencyStyles.progressIndicatorContainer}>
          <Text
            style={[
              currencyStyles.progressStepText,
              { color: isDark ? "#94A3B8" : "#475569" },
            ]}
          >
            1 of 3
          </Text>
          <View style={currencyStyles.progressBarsRow}>
            <View
              style={[
                currencyStyles.progressBar,
                currencyStyles.progressBarActive,
              ]}
            />
            <View
              style={[
                currencyStyles.progressBar,
                { backgroundColor: isDark ? "#334155" : "#CBD5E1" },
              ]}
            />
            <View
              style={[
                currencyStyles.progressBar,
                { backgroundColor: isDark ? "#334155" : "#CBD5E1" },
              ]}
            />
          </View>
        </View>

        <View style={currencyStyles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          currencyStyles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Subtitle (Image 5) */}
        <Text
          style={[
            currencyStyles.titleText,
            {
              color: colors.ink,
              fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
            },
          ]}
        >
          Choose your currency
        </Text>
        <Text
          style={[
            currencyStyles.subtitleText,
            { color: isDark ? "#94A3B8" : "#64748B" },
          ]}
        >
          Amounts will be displayed in your preferred currency.
        </Text>

        {/* Search Bar (Image 5) */}
        <View
          style={[
            currencyStyles.searchBar,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#E2E8F0",
            },
          ]}
        >
          <Search
            size={20}
            color="#94A3B8"
            strokeWidth={2}
            style={{ marginRight: 10 }}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search currencies"
            placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
            style={[currencyStyles.searchInput, { color: colors.ink }]}
          />
        </View>

        {/* Currency Cards List (Image 5) */}
        <View
          style={[
            currencyStyles.currencyList,
            isWide && {
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            },
          ]}
        >
          {filteredCurrencies.map((opt) => {
            const isSelected = chosen === opt.code;
            return (
              <Pressable
                key={opt.code}
                accessibilityRole="button"
                accessibilityLabel={`${opt.code}, ${opt.name}`}
                onPress={() => {
                  setChosen(opt.code);
                  onSelectCurrency(opt.code);
                }}
                style={({ pressed }) => [
                  currencyStyles.currencyCard,
                  isWide && { width: "48.8%" },
                  {
                    backgroundColor: isDark ? colors.surface : "#FFFFFF",
                    borderColor: isSelected
                      ? "#0F6E56"
                      : isDark
                        ? colors.border
                        : "#F1F5F9",
                    borderWidth: isSelected ? 1.5 : 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {/* Symbol Circle Badge */}
                <View
                  style={[
                    currencyStyles.symbolBadge,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? "#172E24"
                          : "#EBF5F0"
                        : isDark
                          ? "#1E293B"
                          : "#F1F5F9",
                    },
                  ]}
                >
                  <Text
                    style={[
                      currencyStyles.symbolBadgeText,
                      {
                        color: isSelected ? "#0F6E56" : colors.ink,
                        fontFamily: opt.symbol === "৳" ? "Bengali" : undefined,
                      },
                    ]}
                  >
                    {opt.symbol}
                  </Text>
                </View>

                {/* Name & Code */}
                <View style={currencyStyles.infoCol}>
                  <Text
                    style={[
                      currencyStyles.codeText,
                      {
                        color: colors.ink,
                        fontFamily:
                          locale === "bn" ? "Bengali" : "OutfitMedium",
                      },
                    ]}
                  >
                    {opt.code}
                  </Text>
                  <Text
                    style={[
                      currencyStyles.nameText,
                      { color: isDark ? "#94A3B8" : "#64748B" },
                    ]}
                  >
                    {opt.name}
                  </Text>
                </View>

                {/* Right Side Symbol & Radio / Checkmark */}
                <Text
                  style={[
                    currencyStyles.rightSymbolText,
                    {
                      color: colors.ink,
                      fontFamily: opt.symbol === "৳" ? "Bengali" : undefined,
                    },
                  ]}
                >
                  {opt.symbol}
                </Text>

                {isSelected ? (
                  <View style={currencyStyles.checkedCircle}>
                    <CheckCircle2 size={22} color="#0F6E56" strokeWidth={2.2} />
                  </View>
                ) : (
                  <View
                    style={[
                      currencyStyles.radioCircleEmpty,
                      { borderColor: isDark ? "#475569" : "#CBD5E1" },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Continue Button (Image 5) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          disabled={busy}
          onPress={() => onContinue(chosen)}
          style={({ pressed }) => [
            currencyStyles.continueButton,
            { opacity: pressed || busy ? 0.85 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text
                style={[
                  currencyStyles.continueButtonText,
                  { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
                ]}
              >
                Continue
              </Text>
              <ArrowRight
                size={20}
                color="#FFFFFF"
                strokeWidth={2.2}
                style={{ marginLeft: 8 }}
              />
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const currencyStyles = StyleSheet.create({
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
  topBarSpacer: {
    width: 44,
  },
  progressIndicatorContainer: {
    alignItems: "center",
  },
  progressStepText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  progressBarsRow: {
    flexDirection: "row",
    gap: 6,
  },
  progressBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: "#065F46",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  titleText: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  currencyList: {
    gap: 12,
    marginBottom: 20,
  },
  currencyCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  symbolBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  symbolBadgeText: {
    fontSize: 20,
    fontWeight: "700",
  },
  infoCol: {
    flex: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: "700",
  },
  nameText: {
    fontSize: 13,
    marginTop: 2,
  },
  rightSymbolText: {
    fontSize: 17,
    fontWeight: "600",
    marginRight: 12,
  },
  checkedCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  continueButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#065F46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
