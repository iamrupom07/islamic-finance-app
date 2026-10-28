import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Preferences } from "../api/types";
import { api, dataOf, sessions } from "../api/client";
import { prayerReminderPlan, type Reminder } from "./plan";
import { localDate } from "../i18n/formatters";
let generation = 0;
let queue: Promise<unknown> = Promise.resolve();
export async function clearReminders() {
  generation++;
  if (Platform.OS === "web") return;
  for (const r of await Notifications.getAllScheduledNotificationsAsync())
    if (r.identifier.startsWith("amanah:"))
      await Notifications.cancelScheduledNotificationAsync(r.identifier);
}
export async function reminderCoverage(userId: string) {
  if (Platform.OS === "web") return null;
  const rows = await Notifications.getAllScheduledNotificationsAsync();
  return (
    rows
      .filter((r) => r.identifier.startsWith(`amanah:${userId}:prayer:`))
      .map((r) => r.content.data?.at)
      .filter(
        (t): t is string => typeof t === "string" && Date.parse(t) > Date.now(),
      )
      .sort()
      .at(-1) ?? null
  );
}
export async function requestReminderPermission() {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("prayer", {
      name: "Amanah reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  return (await Notifications.requestPermissionsAsync()).granted;
}
export function reconcileReminders(userId: string, p: Preferences) {
  const run = async () => {
    if (Platform.OS === "web") return;
    const epoch = generation;
    const valid = () => epoch === generation && sessions.user?.id === userId;
    if (!valid()) return;
    const context = JSON.stringify([
      p.cityId,
      p.timezone,
      p.methodId,
      p.school,
      p.reminders,
      p.hijriAnchor,
    ]);
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    // Remove old-account/changed-settings schedules; keep valid same-context schedules during outages.
    for (const r of existing) {
      if (!valid()) return;
      if (
        r.identifier.startsWith("amanah:") &&
        (!r.identifier.startsWith(`amanah:${userId}:`) ||
          r.content.data?.context !== context)
      )
        await Notifications.cancelScheduledNotificationAsync(r.identifier);
    }
    if (!valid() || !(await Notifications.getPermissionsAsync()).granted)
      return;
    const days = [];
    const successful = new Set<string>();
    const today = localDate(p.timezone);
    if (p.reminders.prayers.length)
      for (let i = 0; i < 7; i++) {
        if (!valid()) return;
        const date = new Date(today + "T12:00:00Z");
        date.setUTCDate(date.getUTCDate() + i);
        const day = date.toISOString().slice(0, 10);
        try {
          const result = dataOf(
            await api.GET("/v1/prayer/today", {
              params: { query: { date: day } },
            }),
          );
          if (result.date === day && !result.isStale) {
            days.push(result);
            successful.add(day);
          }
        } catch {
          /* A failed refresh does not remove existing validated schedules. */
        }
      }
    const plan: Reminder[] = prayerReminderPlan(days, p.reminders.prayers);
    if (p.reminders.anniversaryDays.length)
      try {
        const s = dataOf(await api.GET("/v1/zakat/summary"));
        if (s.period)
          for (const lead of p.reminders.anniversaryDays) {
            const day = new Date(s.period.end + "T09:00:00+06:00");
            day.setUTCDate(day.getUTCDate() - lead);
            if (day > new Date())
              plan.push({
                id: `anniversary:${s.period.end}:${lead}`,
                at: day.toISOString(),
                title: "Amanah",
                body: "Review your declared zakat period and current holdings.",
                url: "/zakat",
              });
          }
      } catch {
        /* Preserve existing reminders while assessment data is unavailable. */
      }
    const desired = new Set(
      plan.map((item) => `amanah:${userId}:${item.id}:${Date.parse(item.at)}`),
    );
    const retained = new Set(
      existing
        .filter((r) => r.content.data?.context === context)
        .map((r) => r.identifier),
    );
    for (const item of plan) {
      if (!valid()) return;
      const id = `amanah:${userId}:${item.id}:${Date.parse(item.at)}`;
      if (retained.has(id)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: item.title,
          body: item.body,
          data: { url: item.url, at: item.at, context },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(item.at),
          channelId: "prayer",
        },
      });
      if (!valid()) {
        await Notifications.cancelScheduledNotificationAsync(id);
        return;
      }
    }
    for (const r of existing) {
      if (!valid()) return;
      const day = r.identifier.split(":")[3];
      if (
        r.identifier.startsWith(`amanah:${userId}:prayer:`) &&
        r.content.data?.context === context &&
        day &&
        successful.has(day) &&
        !desired.has(r.identifier)
      )
        await Notifications.cancelScheduledNotificationAsync(r.identifier);
    }
    const weekly = `amanah:${userId}:weekly`;
    if (p.reminders.weeklySummary && valid() && !retained.has(weekly)) {
      await Notifications.scheduleNotificationAsync({
        identifier: weekly,
        content: {
          title: "Amanah",
          body: "Open Amanah for your weekly finance review.",
          data: { url: "/finance", context },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1,
          hour: 9,
          minute: 0,
          channelId: "prayer",
        },
      });
      if (!valid())
        await Notifications.cancelScheduledNotificationAsync(weekly);
    }
  };
  queue = queue.catch(() => {}).then(run);
  return queue;
}
