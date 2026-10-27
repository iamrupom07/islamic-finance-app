import { formatMoney, localDate } from "../src/core/i18n/formatters";
import { prayerReminderPlan } from "../src/core/notifications/plan";
import {
  safeDestination,
  rememberDestination,
  consumeDestination,
  setupDestination,
} from "../src/core/navigation/destinations";
import { translate, bn } from "../src/core/i18n/messages";
import { light, dark } from "../src/design-system/tokens";
it.each([
  ["0.10", "৳0.10"],
  ["12345678901234.1234", "৳12,345,678,901,234.12"],
  ["0.105", "৳0.11"],
])("formats %s without floating point loss", (value, expected) =>
  expect(formatMoney(value)).toBe(expected),
);
it("formats Bangla digits", () =>
  expect(formatMoney("1250", "BDT", "bn")).toBe("৳১,২৫০.০০"));
it("rejects malformed money and handles unavailable values", () => {
  expect(formatMoney("not-money")).toBe("—");
  expect(formatMoney(null)).toBe("—");
});
it("uses an ISO civil date", () =>
  expect(localDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/));
it.each([
  "https://evil.invalid",
  "//evil.invalid",
  "/settings/../login",
  "/settings\\export",
  "/login",
  "/unknown",
])("rejects unsafe deep destination %s", (value) =>
  expect(safeDestination(value)).toBeNull(),
);
it("preserves an allowed destination exactly once", () => {
  rememberDestination("/zakat/history/123");
  expect(consumeDestination()).toBe("/zakat/history/123");
  expect(consumeDestination()).toBeNull();
});
it("resumes setup at a saved step", () => {
  expect(setupDestination(1)).toBe("/nisab");
  expect(setupDestination(2)).toBe("/prayer-preferences");
});
it("never schedules a stale or past prayer", () => {
  const days = [
    {
      date: "2026-10-26",
      isStale: false,
      timings: [
        { name: "Fajr", at: "2026-10-26T01:00:00Z" },
        { name: "Dhuhr", at: "2026-10-26T07:00:00Z" },
        { name: "Sunrise", at: "2026-10-26T02:00:00Z" },
      ],
    },
    {
      date: "2026-10-27",
      isStale: true,
      timings: [{ name: "Fajr", at: "2026-10-27T01:00:00Z" }],
    },
  ];
  const result = prayerReminderPlan(
    days,
    ["Fajr", "Dhuhr", "Sunrise"],
    new Date("2026-10-26T06:00:00Z"),
  );
  expect(result.map((r) => r.id)).toEqual(["prayer:2026-10-26:Dhuhr"]);
  expect(result[0]?.body).not.toMatch(/balance|debt|BDT/);
});
it("has the same named colors for light and dark themes", () =>
  expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort()));
it("translates the main navigation consistently", () => {
  for (const label of ["Home", "Finance", "Quran", "Dua", "Profile"])
    expect(translate(label, "bn")).toBe(bn[label]);
});
import uiCopy from "../src/core/i18n/ui-copy.json";
it("includes Bangla translations for static visible UI copy", () => {
  expect(uiCopy.filter((s) => !bn[s])).toEqual([]);
});
