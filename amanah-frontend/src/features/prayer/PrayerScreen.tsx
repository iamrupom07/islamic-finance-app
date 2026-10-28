import React, { useEffect, useState, useMemo } from "react";
import { Switch, View, StyleSheet } from "react-native";
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
import { processPrayerSchedule } from "./prayer-schedule";

export function PrayerScreen() {
  const router = useRouter();
  const auth = useAuth();
  const p = auth.account!.preferences;
  const [tick, setTick] = useState(Date.now());
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
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

  const processed = useMemo(() => {
    return q.data ? processPrayerSchedule(q.data, new Date(tick)) : null;
  }, [q.data, tick]);

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

              {processed?.activeForbidden ? (
                <View style={styles.forbiddenActiveBox}>
                  <Copy style={styles.forbiddenActiveTitle}>
                    {`⚠️ Prohibited prayer time: ${processed.activeForbidden.title} (${processed.activeForbidden.range})`}
                  </Copy>
                  <Copy style={styles.forbiddenActiveSub}>
                    {`Ends in ${processed.activeForbidden.remainingFormatted} · Voluntary prayers are prohibited`}
                  </Copy>
                </View>
              ) : null}

              {processed?.activeWaqt ? (
                <Copy medium style={styles.activeWaqtText}>
                  {`Current waqt: ${processed.activeWaqt.name} (${processed.activeWaqt.range}) · Ends in ${processed.activeWaqt.remainingFormatted}`}
                </Copy>
              ) : null}

              {processed?.nextPrayer ? (
                <Copy>{`Next prayer: ${processed.nextPrayer.name} · in ${processed.nextPrayer.remainingFormatted}`}</Copy>
              ) : (
                <Copy>Today's schedule is complete.</Copy>
              )}

              {q.data.isStale ? (
                <Copy>
                  Showing a stale schedule. Reminders will not use stale times.
                </Copy>
              ) : null}
            </Card>

            {/* 5 Daily Prayer Waqts Card */}
            <Card>
              <Copy size={18} medium style={styles.sectionHeader}>
                5 Daily Prayer Waqts
              </Copy>
              {processed?.waqts
                ? processed.waqts.map((w) => (
                    <View
                      key={w.name}
                      style={[
                        styles.waqtRow,
                        w.isActive && styles.waqtRowActive,
                      ]}
                    >
                      <View style={styles.waqtInfoCol}>
                        <Row style={styles.waqtNameRow}>
                          <Copy
                            medium
                            style={
                              w.isActive ? styles.waqtNameActive : undefined
                            }
                          >
                            {w.name}
                          </Copy>
                          {w.isActive ? (
                            <View style={styles.activeTag}>
                              <Copy style={styles.activeTagText}>
                                {`Active · ends in ${w.remainingFormatted}`}
                              </Copy>
                            </View>
                          ) : w.isNext ? (
                            <View style={styles.nextTag}>
                              <Copy style={styles.nextTagText}>Next</Copy>
                            </View>
                          ) : null}
                        </Row>
                        <Copy size={14} muted>
                          {w.range}
                        </Copy>
                      </View>

                      <Row style={styles.waqtRightRow}>
                        <Copy
                          size={20}
                          style={w.isActive ? styles.waqtTimeActive : undefined}
                        >
                          {w.startTime}
                        </Copy>
                        <Switch
                          accessibilityLabel={`${w.name} reminder`}
                          disabled={saving}
                          value={p.reminders.prayers.includes(
                            w.name as (typeof p.reminders.prayers)[number],
                          )}
                          onValueChange={(on) => {
                            void toggle(w.name, on);
                          }}
                        />
                      </Row>
                    </View>
                  ))
                : q.data.timings.map((t) => (
                    <Row
                      key={t.name}
                      style={{
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                      }}
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

            {/* 3 Forbidden Times in Islam Card */}
            {processed && processed.forbiddenIntervals.length > 0 ? (
              <Card>
                <Copy size={18} medium style={styles.sectionHeader}>
                  3 Forbidden Times in Islam
                </Copy>
                <Copy muted style={styles.forbiddenCardSub}>
                  Voluntary prayers (nafl) are strictly prohibited during these
                  three times (Sahih Muslim 831).
                </Copy>

                {processed.forbiddenIntervals.map((f) => (
                  <View
                    key={f.name}
                    style={[
                      styles.forbiddenIntervalCard,
                      f.isActive && styles.forbiddenIntervalCardActive,
                    ]}
                  >
                    <Row
                      style={{
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Copy
                        medium
                        style={
                          f.isActive
                            ? styles.forbiddenIntervalTitleActive
                            : undefined
                        }
                      >
                        {f.title}
                      </Copy>
                      <Copy
                        size={16}
                        medium
                        style={
                          f.isActive
                            ? styles.forbiddenIntervalRangeActive
                            : undefined
                        }
                      >
                        {f.range}
                      </Copy>
                    </Row>
                    <Row
                      style={{ justifyContent: "space-between", marginTop: 4 }}
                    >
                      <Copy
                        size={13}
                        muted
                        style={{ flex: 1, paddingRight: 8 }}
                      >
                        {f.explanation}
                      </Copy>
                      {f.isActive ? (
                        <View style={styles.activeForbiddenPill}>
                          <Copy style={styles.activeForbiddenPillText}>
                            {`Active now · ${f.remainingFormatted} left`}
                          </Copy>
                        </View>
                      ) : null}
                    </Row>
                  </View>
                ))}
              </Card>
            ) : null}

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

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 8,
  },
  activeWaqtText: {
    color: "#0F6E56",
    marginTop: 4,
  },
  waqtRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  waqtRowActive: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  waqtInfoCol: {
    gap: 2,
    flex: 1,
  },
  waqtNameRow: {
    alignItems: "center",
    gap: 8,
  },
  waqtNameActive: {
    color: "#0F6E56",
    fontWeight: "700",
  },
  waqtTimeActive: {
    color: "#0F6E56",
    fontWeight: "700",
  },
  waqtRightRow: {
    alignItems: "center",
    gap: 12,
  },
  activeTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeTagText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "600",
  },
  nextTag: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nextTagText: {
    fontSize: 11,
    color: "#0284C7",
    fontWeight: "600",
  },
  forbiddenActiveBox: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  forbiddenActiveTitle: {
    color: "#92400E",
    fontWeight: "600",
    fontSize: 14,
  },
  forbiddenActiveSub: {
    color: "#B45309",
    fontSize: 12,
    marginTop: 2,
  },
  forbiddenCardSub: {
    marginBottom: 12,
  },
  forbiddenIntervalCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  forbiddenIntervalCardActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  forbiddenIntervalTitleActive: {
    color: "#92400E",
    fontWeight: "700",
  },
  forbiddenIntervalRangeActive: {
    color: "#92400E",
    fontWeight: "700",
  },
  activeForbiddenPill: {
    backgroundColor: "#FDE68A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeForbiddenPillText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
});
