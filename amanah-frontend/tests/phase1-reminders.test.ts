import * as Notifications from "expo-notifications";
import { api } from "../src/core/api/client";
import {
  reconcileReminders,
  reminderCoverage,
} from "../src/core/notifications/scheduler";
const mockRows: any[] = [];
jest.mock("expo-notifications", () => ({
  getAllScheduledNotificationsAsync: jest.fn(async () => mockRows),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => "id"),
  SchedulableTriggerInputTypes: { DATE: "date", WEEKLY: "weekly" },
}));
jest.mock("../src/core/api/client", () => ({
  api: { GET: jest.fn() },
  dataOf: (r: any) => r.data.data,
  sessions: { user: { id: "test" } },
}));
const p: any = {
  cityId: "dhaka",
  timezone: "Asia/Dhaka",
  methodId: 1,
  school: 1,
  hijriAnchor: null,
  reminders: { prayers: ["Fajr"], anniversaryDays: [], weeklySummary: false },
};
beforeEach(() => {
  jest.clearAllMocks();
  mockRows.length = 0;
  jest.mocked(api.GET).mockRejectedValue(Error("source unavailable"));
});
it("preserves validated same-setting reminders when every refresh fails", async () => {
  const at = new Date(Date.now() + 86400000).toISOString();
  const context = JSON.stringify([
    p.cityId,
    p.timezone,
    p.methodId,
    p.school,
    p.reminders,
    p.hijriAnchor,
  ]);
  mockRows.push({
    identifier: `amanah:test:prayer:${at.slice(0, 10)}:Fajr:123`,
    content: { data: { context, at } },
  });
  await reconcileReminders("test", p);
  expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(await reminderCoverage("test")).toBe(at);
});
it("removes old-city reminders even when the new-city source is unavailable", async () => {
  mockRows.push({
    identifier: "amanah:test:prayer:2026-10-27:Fajr:123",
    content: { data: { context: "old city" } },
  });
  await reconcileReminders("test", { ...p, cityId: "khulna" });
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
    "amanah:test:prayer:2026-10-27:Fajr:123",
  );
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
