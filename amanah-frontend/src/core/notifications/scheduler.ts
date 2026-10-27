import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Preferences } from "../api/types";
import { api, dataOf, sessions } from "../api/client";
import { prayerReminderPlan, type Reminder } from "./plan";
import { localDate } from "../i18n/formatters";
export async function clearReminders() {
  if (Platform.OS === "web") return;
  for (const r of await Notifications.getAllScheduledNotificationsAsync())
    if (r.identifier.startsWith("amanah:"))
      await Notifications.cancelScheduledNotificationAsync(r.identifier);
}
export async function requestReminderPermission() {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("prayer", {
      name: "Amanah reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}
let queue: Promise<unknown> = Promise.resolve();
export function reconcileReminders(userId: string, p: Preferences) {
  const run = async () => {
    if (Platform.OS === "web") return;
    await clearReminders();
    if (sessions.user?.id !== userId) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    const days = [];
    const today = localDate(p.timezone);
    for (let i = 0; i < 3; i++) {
      const date = new Date(today + "T12:00:00Z");
      date.setUTCDate(date.getUTCDate() + i);
      try {
        days.push(
          dataOf(
            await api.GET("/v1/prayer/today", {
              params: { query: { date: date.toISOString().slice(0, 10) } },
            }),
          ),
        );
      } catch {
        /* Never schedule guessed or past-day times. */
      }
    }
    const plan: Reminder[] = prayerReminderPlan(days, p.reminders.prayers);
    if (p.reminders.anniversaryDays.length) {
      try {
        const summary = dataOf(await api.GET("/v1/zakat/summary"));
        if (summary.period)
          for (const lead of p.reminders.anniversaryDays) {
            const day = new Date(summary.period.end + "T09:00:00+06:00");
            day.setUTCDate(day.getUTCDate() - lead);
            if (day > new Date())
              plan.push({
                id: `anniversary:${lead}`,
                at: day.toISOString(),
                title: "Amanah",
                body: "Review your declared zakat period and current holdings.",
                url: "/zakat",
              });
          }
      } catch {
        /* Missing policy or period does not create a reminder. */
      }
    }
    for (const item of plan) {
      if (sessions.user?.id !== userId) return;
      await Notifications.scheduleNotificationAsync({
        identifier: `amanah:${userId}:${item.id}`,
        content: {
          title: item.title,
          body: item.body,
          data: { url: item.url },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(item.at),
          channelId: "prayer",
        },
      });
    }
    if (p.reminders.weeklySummary && sessions.user?.id === userId)
      await Notifications.scheduleNotificationAsync({
        identifier: `amanah:${userId}:weekly`,
        content: {
          title: "Amanah",
          body: "Your weekly finance review is ready in the app.",
          data: { url: "/finance" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1,
          hour: 9,
          minute: 0,
          channelId: "prayer",
        },
      });
  };
  queue = queue.catch(() => {}).then(run);
  return queue;
}
