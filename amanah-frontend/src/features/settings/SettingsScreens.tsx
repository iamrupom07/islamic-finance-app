import React, { useState, useEffect } from "react";
import {
  Linking,
  Switch,
  AppState,
  Platform,
  View,
  Text,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import {
  Screen,
  Card,
  Copy,
  Choice,
  Field,
  PasswordField,
  Button,
  ActionRow,
  Row,
  ErrorRetry,
  ConfirmSheet,
  useToast,
  QueryState,
} from "../../design-system/components";
import { api, dataOf, queryClient } from "../../core/api/client";
import { useAuth } from "../../core/auth/AuthProvider";
import type { Preferences } from "../../core/api/types";
import type { paths } from "../../core/api/schema";
import { requestReminderPermission } from "../../core/notifications/scheduler";
import { shareExport } from "../../core/storage/export-file";
import { socialProof } from "../auth/social";
import { useContent } from "../../content/ContentProvider";
import type { PricingBenchmark } from "../market/bd-rates";
type Patch =
  paths["/v1/me/preferences"]["patch"]["requestBody"]["content"]["application/json"];
function usePreferenceSave() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const toast = useToast();
  return {
    busy,
    error,
    save: async (changes: Omit<Patch, "version">) => {
      setBusy(true);
      setError(null);
      try {
        await api.PATCH("/v1/me/preferences", {
          body: { version: auth.account!.preferences.version, ...changes },
        });
        await queryClient.invalidateQueries({
          queryKey: ["user", auth.user!.id],
        });
        await auth.reload();
        toast("Saved");
        return true;
      } catch (e) {
        setError(e);
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}
export function ProfileScreen() {
  const a = useAuth();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const p = a.account!.preferences;
  return (
    <Screen title="Profile" tabs>
      <Card tint>
        <Copy size={24}>{a.user!.email.split("@")[0]}</Copy>
        <Copy muted>{a.user!.email}</Copy>
      </Card>
      <Card>
        {[
          { label: "Currency", route: "currency", value: p.currency },
          { label: "Nisab standard", route: "nisab", value: p.nisabStandard },
          { label: "Prayer settings", route: "location", value: p.cityId },
          { label: "Notifications", route: "notification", value: undefined },
          { label: "Appearance", route: "appearance", value: p.appearance },
          { label: "Language", route: "language", value: p.locale },
          { label: "Privacy & security", route: "privacy", value: undefined },
          { label: "Export data", route: "export", value: undefined },
          { label: "About Amanah", route: "about", value: undefined },
        ].map((row) => (
          <ActionRow
            key={row.route}
            label={row.label}
            detail={row.value}
            onPress={() => router.push(`/settings/${row.route}` as any)}
          />
        ))}
      </Card>
      <Button secondary label="Sign out" onPress={() => setConfirm(true)} />
      <Button
        secondary
        danger
        label="Delete account"
        onPress={() => router.push("/settings/delete-account")}
      />
      {error ? (
        <>
          <ErrorRetry error={error} />
          <Copy muted>
            Signing out on this device clears local credentials. If the server
            is unreachable, its session stays valid until revoked or expired.
          </Copy>
          <Button
            secondary
            label="Sign out on this device only"
            onPress={() => {
              void a.clear().catch(setError);
            }}
          />
        </>
      ) : null}
      <ConfirmSheet
        visible={confirm}
        title="Sign out?"
        message="Your server session will be revoked and private device caches cleared."
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setBusy(true);
          void a
            .logout()
            .catch(setError)
            .finally(() => {
              setBusy(false);
              setConfirm(false);
            });
        }}
      />
    </Screen>
  );
}
export function PreferenceScreen({
  kind,
}: {
  kind: "currency" | "appearance" | "language";
}) {
  const { account } = useAuth();
  const p = account!.preferences;
  const [value, setValue] = useState<string>(
    kind === "currency"
      ? p.currency
      : kind === "appearance"
        ? p.appearance
        : p.locale,
  );
  const save = usePreferenceSave();
  const options =
    kind === "currency"
      ? [
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
        ].map((v) => ({ value: v, label: v }))
      : kind === "appearance"
        ? [
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]
        : [
            { value: "en", label: "English" },
            { value: "bn", label: "Bangla" },
          ];
  return (
    <Screen
      title={
        kind === "currency"
          ? "Currency"
          : kind === "appearance"
            ? "Appearance"
            : "Language"
      }
      back
    >
      <Card>
        <Choice
          label="Choose"
          value={value}
          options={options}
          onChange={setValue}
        />
        {kind === "currency" ? (
          <Copy muted>
            Original transaction currencies and recording rates stay unchanged.
            Converted reports use explicitly labeled display conversions.
          </Copy>
        ) : null}
      </Card>
      {save.error ? <ErrorRetry error={save.error} /> : null}
      <Button
        label="Save changes"
        busy={save.busy}
        onPress={() => {
          void save.save(
            kind === "currency"
              ? { currency: value as Preferences["currency"] }
              : kind === "appearance"
                ? { appearance: value as Preferences["appearance"] }
                : { locale: value as Preferences["locale"] },
          );
        }}
      />
    </Screen>
  );
}
export function LocationSettingsScreen() {
  const { account } = useAuth();
  const p = account!.preferences;
  const [city, setCity] = useState(p.cityId);
  const [method, setMethod] = useState(p.methodId);
  const [school, setSchool] = useState(p.school as 0 | 1);
  const save = usePreferenceSave();
  const q = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => dataOf(await api.GET("/v1/catalog")),
  });
  return (
    <Screen title="Prayer settings" back>
      <QueryState query={q}>
        {q.data ? (
          <Card>
            <Choice
              label="City"
              value={city}
              options={q.data.cities.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              onChange={setCity}
            />
            <Choice
              label="Method"
              value={method}
              options={q.data.methods.map((m) => ({
                value: m.id,
                label: m.name,
              }))}
              onChange={setMethod}
            />
            <Choice
              label="School"
              value={school}
              options={[
                { value: 0, label: "Standard" },
                { value: 1, label: "Hanafi" },
              ]}
              onChange={setSchool}
            />
            <Copy muted>
              {q.data.cities.find((c) => c.id === city)?.timezone}
            </Copy>
            <Copy muted>
              Changing these values clears the old reminder plan and schedules
              only validated times for your new selection.
            </Copy>
          </Card>
        ) : null}
      </QueryState>
      {save.error ? <ErrorRetry error={save.error} /> : null}
      <Button
        label="Save changes"
        busy={save.busy}
        onPress={() => {
          void save.save({ cityId: city, methodId: method, school });
        }}
      />
    </Screen>
  );
}
export function NisabSettingsScreen() {
  const { account } = useAuth();
  const p = account!.preferences;
  const [standard, setStandard] = useState(p.nisabStandard);
  const [policy, setPolicy] = useState(p.policyVersionId ?? "");
  const [anchor, setAnchor] = useState(p.hijriAnchor ?? "");
  const [continuity, setContinuity] = useState(p.continuityConfirmed);
  const [confirm, setConfirm] = useState(false);
  const [benchmark, setBenchmark] = useState<PricingBenchmark>("BAJUS");
  const save = usePreferenceSave();
  const q = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => dataOf(await api.GET("/v1/catalog")),
  });
  useEffect(() => {
    const firstPolicy = q.data?.policies?.[0];
    if (!policy && firstPolicy) {
      setPolicy(firstPolicy.id);
    }
  }, [q.data?.policies, policy]);
  return (
    <Screen title="Nisab standard" back>
      {p.currency === "BDT" ? (
        <Card>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Copy medium size={16}>
              Live BD Metal Rates & Nisab
            </Copy>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="BAJUS (BD)"
                onPress={() => setBenchmark("BAJUS")}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 14,
                  backgroundColor:
                    benchmark === "BAJUS" ? "#0F6E56" : "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: benchmark === "BAJUS" ? "#FFFFFF" : "#64748B",
                  }}
                >
                  BAJUS (BD)
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Spot"
                onPress={() => setBenchmark("INTERNATIONAL")}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 14,
                  backgroundColor:
                    benchmark === "INTERNATIONAL" ? "#0F6E56" : "#F1F5F9",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color:
                      benchmark === "INTERNATIONAL" ? "#FFFFFF" : "#64748B",
                  }}
                >
                  Spot
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            style={{
              backgroundColor: "#F8FAF9",
              borderRadius: 10,
              padding: 10,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              gap: 6,
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Copy muted size={13}>
                Gold 24K pure
              </Copy>
              <Copy medium size={13}>
                <Text style={{ fontWeight: "700" }}>৳20,879</Text> /g (৳243,530
                /vori)
              </Copy>
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Copy muted size={13}>
                Gold 22K jewelry
              </Copy>
              <Copy medium size={13}>
                <Text style={{ fontWeight: "700" }}>৳19,125</Text> /g (৳223,074
                /vori)
              </Copy>
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Copy muted size={13}>
                Silver 22K hallmark
              </Copy>
              <Copy medium size={13}>
                <Text style={{ fontWeight: "700" }}>৳220</Text> /g (৳2,566
                /vori)
              </Copy>
            </View>
            <Copy muted size={11}>
              Official BAJUS Rates (Bangladesh Jewellers Association)
            </Copy>
          </View>

          <View style={{ gap: 8, marginBottom: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select Silver Nisab standard"
              onPress={() => setStandard("SILVER")}
              style={{
                padding: 12,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: standard === "SILVER" ? "#0F6E56" : "#E2E8F0",
                backgroundColor: standard === "SILVER" ? "#F0FDF4" : "#FFFFFF",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#0F172A",
                    }}
                  >
                    Silver Standard (612.36g · 52.5 vori)
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}
                  >
                    Recommended for maximum caution
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: "#0F6E56",
                  }}
                >
                  ৳134,719
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select Gold Nisab standard"
              onPress={() => setStandard("GOLD")}
              style={{
                padding: 12,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: standard === "GOLD" ? "#0F6E56" : "#E2E8F0",
                backgroundColor: standard === "GOLD" ? "#F0FDF4" : "#FFFFFF",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#0F172A",
                    }}
                  >
                    Gold Standard (87.48g · 7.5 vori)
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}
                  >
                    Pure gold baseline
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: "#0F6E56",
                  }}
                >
                  ৳1,826,479
                </Text>
              </View>
            </Pressable>
          </View>
        </Card>
      ) : null}
      <Card>
        <Choice
          label="Nisab standard"
          value={standard}
          options={[
            { label: "Silver", value: "SILVER" },
            { label: "Gold", value: "GOLD" },
          ]}
          onChange={setStandard}
        />
        <QueryState query={q}>
          {q.data?.policies.length ? (
            <Choice
              label="Reviewed policy"
              value={policy}
              options={q.data.policies.map((p) => ({
                value: p.id,
                label: p.version,
              }))}
              onChange={setPolicy}
            />
          ) : (
            <Copy muted>
              No reviewed policy is installed. Calculation remains unavailable
              until one is approved.
            </Copy>
          )}
        </QueryState>
        {q.data?.policies.find((v) => v.id === policy) ? (
          <Copy muted>
            {q.data.policies.find((v) => v.id === policy)!.sourceNotes}
          </Copy>
        ) : null}
        <Field
          label="Hijri start date (YYYY-MM-DD)"
          value={anchor}
          onChangeText={setAnchor}
        />
        <Row>
          <Copy style={{ flex: 1 }}>
            I confirm continuity above nisab for this declared period
          </Copy>
          <Switch
            accessibilityLabel="Confirm continuity"
            value={continuity}
            onValueChange={setContinuity}
          />
        </Row>
        <Copy muted>
          The civil Hijri calendar can differ from local observation. Changing
          the period or standard affects current estimates; historical
          assessments do not change. Ask an advisor if you are unsure.
        </Copy>
      </Card>
      {save.error ? <ErrorRetry error={save.error} /> : null}
      <Button
        label="Save changes"
        onPress={() => setConfirm(true)}
        busy={save.busy}
      />
      <ConfirmSheet
        visible={confirm}
        title="Update calculation preferences?"
        message="Confirm the selected policy, nisab standard and declared period. This does not establish a religious ruling or create a payment."
        busy={save.busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          void save
            .save({
              nisabStandard: standard,
              ...(policy ? { policyVersionId: policy } : {}),
              hijriAnchor: anchor || null,
              continuityConfirmed: continuity,
            })
            .then((ok) => {
              if (ok) setConfirm(false);
            });
        }}
      />
    </Screen>
  );
}
export function NotificationSettingsScreen() {
  const { account } = useAuth();
  const p = account!.preferences;
  const [reminders, setReminders] = useState(p.reminders);
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const save = usePreferenceSave();
  useEffect(() => {
    const read = () => {
      if (Platform.OS !== "web")
        void Notifications.getPermissionsAsync()
          .then((p) => setGranted(p.granted))
          .catch(setError);
    };
    read();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") read();
    });
    return () => sub.remove();
  }, []);
  return (
    <Screen title="Notifications" back>
      <Copy muted>
        {granted
          ? "Device notifications are allowed."
          : "Device notifications are off. App preferences alone cannot override device permission."}
      </Copy>
      {!granted ? (
        <>
          <Button
            label="Allow notifications"
            onPress={() => {
              void requestReminderPermission().then(setGranted).catch(setError);
            }}
          />
          <Button
            secondary
            label="Open device settings"
            onPress={() => {
              void Linking.openSettings().catch(setError);
            }}
          />
        </>
      ) : null}
      <Card>
        {(["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const).map((name) => (
          <Row key={name}>
            <Copy style={{ flex: 1 }}>{name}</Copy>
            <Switch
              accessibilityLabel={`${name} reminder`}
              value={reminders.prayers.includes(name)}
              onValueChange={(on) =>
                setReminders((v) => ({
                  ...v,
                  prayers: on
                    ? [...v.prayers, name]
                    : v.prayers.filter((n) => n !== name),
                }))
              }
            />
          </Row>
        ))}
      </Card>
      <Card>
        <Copy>Anniversary reminders</Copy>
        {([30, 7, 1] as const).map((lead) => (
          <Row key={lead}>
            <Copy
              style={{ flex: 1 }}
            >{`${lead} days before the declared anniversary`}</Copy>
            <Switch
              accessibilityLabel={`${lead} day anniversary reminder`}
              value={reminders.anniversaryDays.includes(lead)}
              onValueChange={(on) =>
                setReminders((v) => ({
                  ...v,
                  anniversaryDays: on
                    ? [...v.anniversaryDays, lead]
                    : v.anniversaryDays.filter((n) => n !== lead),
                }))
              }
            />
          </Row>
        ))}
        <Row>
          <Copy style={{ flex: 1 }}>Weekly summary</Copy>
          <Switch
            accessibilityLabel="Weekly summary"
            value={reminders.weeklySummary}
            onValueChange={(weeklySummary) =>
              setReminders((v) => ({ ...v, weeklySummary }))
            }
          />
        </Row>
      </Card>
      <Copy muted>
        Prayer reminders cover the next few validated days and refresh when you
        reopen the app. OS power settings may delay delivery. Lock-screen
        reminders never include balances or debt details.
      </Copy>
      {error || save.error ? <ErrorRetry error={error ?? save.error} /> : null}
      <Button
        label="Save changes"
        busy={save.busy}
        onPress={() => {
          void save.save({ reminders });
        }}
      />
    </Screen>
  );
}
export function ExportScreen() {
  const [format, setFormat] = useState<"csv" | "json">("json");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <Screen title="Export data" back>
      <Card>
        <Choice
          label="Format"
          value={format}
          options={[
            { label: "JSON · all records", value: "json" },
            { label: "CSV · all records", value: "csv" },
          ]}
          onChange={setFormat}
        />
        <Copy>
          Exports contain private financial information, including
          audit-retained soft-deleted records. Choose a trusted destination in
          the native share sheet. The temporary app file is deleted when sharing
          finishes.
        </Copy>
      </Card>
      {error ? <ErrorRetry error={error} /> : null}
      <Button
        label="Create private export"
        busy={busy}
        onPress={() => {
          setBusy(true);
          setError(null);
          void shareExport(format)
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}
export function AboutScreen() {
  const { bundle } = useContent();
  const [error, setError] = useState<unknown>(null);
  const legal = [
    { label: "Privacy policy", url: process.env.EXPO_PUBLIC_PRIVACY_URL },
    { label: "Terms", url: process.env.EXPO_PUBLIC_TERMS_URL },
  ];
  return (
    <Screen title="About Amanah" back>
      <Card>
        <Copy size={28}>Amanah</Copy>
        <Copy
          muted
        >{`Version ${Constants.expoConfig?.version ?? "0.1.0"}`}</Copy>
        <Copy>
          Amanah tracks activity and declared holdings. It does not hold or
          transfer money. Zakat is a policy-based estimate, not a religious
          ruling.
        </Copy>
        <Copy muted>
          Prayer schedules: Aladhan. Market quotes: GoldAPI.io and
          ExchangeRate-API when configured. Missing or stale sources are
          identified in calculations.
        </Copy>
        <Copy muted>
          {bundle
            ? `${bundle.edition} · ${bundle.license} · ${bundle.source}`
            : "Verified Quran and dua content is not installed."}
        </Copy>
      </Card>
      {legal.map((l) =>
        l.url?.startsWith("https://") ? (
          <Button
            secondary
            key={l.label}
            label={l.label}
            onPress={() => {
              void Linking.openURL(l.url!).catch(setError);
            }}
          />
        ) : (
          <Copy
            key={l.label}
            muted
          >{`${l.label}: not configured for this development build.`}</Copy>
        ),
      )}
      {process.env.EXPO_PUBLIC_SUPPORT_EMAIL ? (
        <Button
          secondary
          label="Contact support"
          onPress={() => {
            void Linking.openURL(
              "mailto:" + process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
            ).catch(setError);
          }}
        />
      ) : null}
      {error ? <ErrorRetry error={error} /> : null}
    </Screen>
  );
}
export function DeleteAccountScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const q = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => dataOf(await api.GET("/v1/catalog")),
  });
  const erase = async (provider?: "GOOGLE" | "APPLE") => {
    setBusy(true);
    setError(null);
    try {
      const body = provider ? await socialProof(provider) : { password };
      const proof = dataOf(await api.POST("/v1/auth/reauth", { body })).proof;
      await api.DELETE("/v1/me/account", {
        body: { proof, confirmation: "DELETE" },
      });
      await auth.clear();
      router.replace("/login");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      setOpen(false);
      setPassword("");
    }
  };
  return (
    <Screen title="Delete account" back>
      <Card>
        <Copy>
          This permanently erases your active account, sessions, financial
          records and saved places. Closed assessments owned by you are also
          deleted. Pseudonymous security audit events and encrypted backups
          follow the operator's documented retention schedule; backups are not
          instantly purged.
        </Copy>
        <PasswordField value={password} onChangeText={setPassword} />
        <Field
          label="Type DELETE to confirm"
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </Card>
      {error ? <ErrorRetry error={error} /> : null}
      <Button
        danger
        label="Delete account"
        disabled={confirmation !== "DELETE" || !password}
        busy={busy}
        onPress={() => setOpen(true)}
      />
      {confirmation === "DELETE" &&
      q.data?.social.google &&
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ? (
        <Button
          danger
          secondary
          label="Confirm with Google and delete"
          busy={busy}
          onPress={() => {
            void erase("GOOGLE");
          }}
        />
      ) : null}
      {confirmation === "DELETE" &&
      q.data?.social.apple &&
      Platform.OS === "ios" ? (
        <Button
          danger
          secondary
          label="Confirm with Apple and delete"
          busy={busy}
          onPress={() => {
            void erase("APPLE");
          }}
        />
      ) : null}
      <ConfirmSheet
        visible={open}
        title="Permanently delete your account?"
        message="This cannot be undone. Confirm your password and deletion request."
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          void erase();
        }}
      />
    </Screen>
  );
}
