import React, { useEffect, useState } from "react";
import { Switch } from "react-native";
import { useRouter } from "expo-router";
import {
  Screen,
  Card,
  Copy,
  Button,
  Row,
  QueryState,
  ErrorRetry,
} from "../../design-system/components";
import { api, dataOf } from "../../core/api/client";
import { useAccountQuery } from "../../core/api/hooks";
import { useAuth } from "../../core/auth/AuthProvider";
import { localDate } from "../../core/i18n/formatters";
import {
  requestReminderPermission,
  reconcileReminders,
} from "../../core/notifications/scheduler";
export function PrayerScreen() {
  const router = useRouter();
  const auth = useAuth();
  const p = auth.account!.preferences;
  const [tick, setTick] = useState(Date.now());
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const date = localDate(p.timezone);
  const q = useAccountQuery(
    ["prayer", date, p.cityId, p.methodId, p.school],
    async () =>
      dataOf(
        await api.GET("/v1/prayer/today", { params: { query: { date } } }),
      ),
    true,
  );
  const next = q.data?.timings.find(
    (t) => t.name !== "Sunrise" && new Date(t.at).getTime() > tick,
  );
  const toggle = async (name: string, on: boolean) => {
    setSaving(true);
    setError(null);
    try {
      if (on && !(await requestReminderPermission()))
        throw Error("Notifications are off in device settings.");
      const prayers = on
        ? [...p.reminders.prayers, name]
        : p.reminders.prayers.filter((n) => n !== name);
      await api.PATCH("/v1/me/preferences", {
        body: {
          version: p.version,
          reminders: {
            ...p.reminders,
            prayers: prayers as typeof p.reminders.prayers,
          },
        },
      });
      await auth.reload();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen
      title="Prayer times"
      back
      refresh={() => {
        void q.refetch();
      }}
      busy={q.isRefetching}
    >
      <QueryState query={q}>
        {q.data ? (
          <>
            <Card tint>
              <Copy size={22}>{q.data.city}</Copy>
              <Copy>{`${q.data.date} · Hijri ${q.data.hijriDate}`}</Copy>
              <Copy muted>{q.data.timezone}</Copy>
              {next ? (
                <Copy>{`Next: ${next.name} · ${Math.max(0, Math.ceil((new Date(next.at).getTime() - tick) / 60000))} minutes`}</Copy>
              ) : (
                <Copy>Today's schedule is complete.</Copy>
              )}
              {q.data.isStale ? (
                <Copy>
                  Showing a stale schedule. Reminders will not use stale times.
                </Copy>
              ) : null}
            </Card>
            <Card>
              {q.data.timings.map((t) => (
                <Row
                  key={t.name}
                  style={{ justifyContent: "space-between", flexWrap: "wrap" }}
                >
                  <Copy medium>{t.name}</Copy>
                  <Copy size={22}>{t.label}</Copy>
                  {t.name !== "Sunrise" ? (
                    <Switch
                      accessibilityLabel={`${t.name} reminder`}
                      disabled={saving}
                      value={p.reminders.prayers.includes(
                        t.name as (typeof p.reminders.prayers)[number],
                      )}
                      onValueChange={(on) => {
                        void toggle(t.name, on);
                      }}
                    />
                  ) : null}
                </Row>
              ))}
            </Card>
            <Copy
              muted
            >{`aladhan · Method ${q.data.methodId} · ${q.data.school === 1 ? "Hanafi" : "Standard"} · ${q.data.asOf}`}</Copy>
            <Copy muted>{q.data.disclaimer}</Copy>
            <Button
              secondary
              label="Refresh reminders"
              onPress={() => {
                void reconcileReminders(auth.user!.id, p).catch(setError);
              }}
            />
          </>
        ) : null}
      </QueryState>
      {error ? <ErrorRetry error={error} /> : null}
      <Button
        label="Prayer settings"
        onPress={() => router.push("/settings/location")}
      />
    </Screen>
  );
}
