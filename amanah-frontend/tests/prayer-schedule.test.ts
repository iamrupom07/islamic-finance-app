import {
  processPrayerSchedule,
  formatCountdown,
  RawPrayerData,
} from "../src/features/prayer/prayer-schedule";

describe("prayer-schedule", () => {
  const sampleSchedule: RawPrayerData = {
    city: "Dhaka",
    timezone: "Asia/Dhaka",
    date: "2026-10-28",
    hijriDate: "17 Jumada al-awwal 1448",
    timings: [
      { name: "Fajr", at: "2026-10-28T04:46:00.000+06:00", label: "04:46" },
      { name: "Sunrise", at: "2026-10-28T06:02:00.000+06:00", label: "06:02" },
      { name: "Dhuhr", at: "2026-10-28T11:42:00.000+06:00", label: "11:42" },
      { name: "Asr", at: "2026-10-28T14:58:00.000+06:00", label: "14:58" },
      { name: "Maghrib", at: "2026-10-28T17:22:00.000+06:00", label: "17:22" },
      { name: "Isha", at: "2026-10-28T18:38:00.000+06:00", label: "18:38" },
    ],
    solarEvents: {
      sunriseAt: "2026-10-28T06:02:00.000+06:00",
      sunsetAt: "2026-10-28T17:22:00.000+06:00",
    },
    windows: [
      {
        name: "Fajr",
        start: "2026-10-28T04:46:00.000+06:00",
        end: "2026-10-28T06:02:00.000+06:00",
      },
      {
        name: "Dhuhr",
        start: "2026-10-28T11:42:00.000+06:00",
        end: "2026-10-28T14:58:00.000+06:00",
      },
      {
        name: "Asr",
        start: "2026-10-28T14:58:00.000+06:00",
        end: "2026-10-28T17:22:00.000+06:00",
      },
      {
        name: "Maghrib",
        start: "2026-10-28T17:22:00.000+06:00",
        end: "2026-10-28T18:38:00.000+06:00",
      },
      {
        name: "Isha",
        start: "2026-10-28T18:38:00.000+06:00",
        end: "2026-10-29T04:47:00.000+06:00",
      },
    ],
    forbiddenIntervals: [
      {
        name: "Sunrise",
        start: "2026-10-28T06:02:00.000+06:00",
        end: "2026-10-28T06:17:00.000+06:00",
        explanation: "Prohibited voluntary prayer while the sun rises.",
      },
      {
        name: "Solar zenith",
        start: "2026-10-28T11:32:00.000+06:00",
        end: "2026-10-28T11:42:00.000+06:00",
        explanation: "Prohibited voluntary prayer when the sun is at meridian.",
      },
      {
        name: "Sunset",
        start: "2026-10-28T17:07:00.000+06:00",
        end: "2026-10-28T17:22:00.000+06:00",
        explanation: "Prohibited voluntary prayer while the sun sets.",
      },
    ],
  };

  it("formats countdown accurately", () => {
    // 5 minutes and 39 seconds
    const ms = (5 * 60 + 39) * 1000;
    expect(formatCountdown(ms)).toBe("00:05:39");
  });

  it("calculates 5 waqt ranges correctly", () => {
    const result = processPrayerSchedule(sampleSchedule);
    expect(result).not.toBeNull();
    expect(result!.waqts).toHaveLength(5);

    const [fajr, dhuhr, asr, maghrib, isha] = result!.waqts;
    expect(fajr!.range).toBe("04:46 – 06:02");
    expect(dhuhr!.range).toBe("11:42 – 14:58");
    expect(asr!.range).toBe("14:58 – 17:22");
    expect(maghrib!.range).toBe("17:22 – 18:38");
    expect(isha!.range).toBe("18:38 – 04:47");
  });

  it("calculates 3 forbidden intervals correctly", () => {
    const result = processPrayerSchedule(sampleSchedule);
    expect(result).not.toBeNull();
    expect(result!.forbiddenIntervals).toHaveLength(3);

    const [sunrise, zenith, sunset] = result!.forbiddenIntervals;
    expect(sunrise!.name).toBe("Sunrise");
    expect(sunrise!.range).toBe("06:02 – 06:17");

    expect(zenith!.name).toBe("Solar zenith");
    expect(zenith!.range).toBe("11:32 – 11:42");

    expect(sunset!.name).toBe("Sunset");
    expect(sunset!.range).toBe("17:07 – 17:22");
  });

  it("detects active Dhuhr waqt and remaining time", () => {
    // Current time: 14:52:21 on 2026-10-28 (5m 39s before Asr at 14:58:00)
    const now = new Date("2026-10-28T14:52:21.000+06:00");
    const result = processPrayerSchedule(sampleSchedule, now);

    expect(result!.activeWaqt).not.toBeNull();
    expect(result!.activeWaqt!.name).toBe("Dhuhr");
    expect(result!.activeWaqt!.remainingFormatted).toBe("00:05:39");

    const dhuhr = result!.waqts.find((w) => w.name === "Dhuhr");
    expect(dhuhr!.isActive).toBe(true);

    const asr = result!.waqts.find((w) => w.name === "Asr");
    expect(asr!.isNext).toBe(true);
    expect(asr!.isActive).toBe(false);
  });

  it("detects active prohibited prayer interval (Zawal / Solar Zenith)", () => {
    // Current time: 11:38:00 on 2026-10-28 (in zenith interval 11:32 - 11:42)
    const now = new Date("2026-10-28T11:38:00.000+06:00");
    const result = processPrayerSchedule(sampleSchedule, now);

    expect(result!.activeForbidden).not.toBeNull();
    expect(result!.activeForbidden!.name).toBe("Solar zenith");
    expect(result!.activeForbidden!.remainingFormatted).toBe("00:04:00");
    expect(result!.activeWaqt).toBeNull(); // No fardh waqt active during zenith before Dhuhr
  });

  it("detects active prohibited prayer interval (Sunrise)", () => {
    // Current time: 06:10:00 (in sunrise interval 06:02 - 06:17)
    const now = new Date("2026-10-28T06:10:00.000+06:00");
    const result = processPrayerSchedule(sampleSchedule, now);

    expect(result!.activeForbidden).not.toBeNull();
    expect(result!.activeForbidden!.name).toBe("Sunrise");
    expect(result!.activeForbidden!.remainingFormatted).toBe("00:07:00");
  });

  it("detects active prohibited prayer interval (Sunset)", () => {
    // Current time: 17:15:00 (in sunset interval 17:07 - 17:22)
    const now = new Date("2026-10-28T17:15:00.000+06:00");
    const result = processPrayerSchedule(sampleSchedule, now);

    expect(result!.activeForbidden).not.toBeNull();
    expect(result!.activeForbidden!.name).toBe("Sunset");
    expect(result!.activeForbidden!.remainingFormatted).toBe("00:07:00");
  });

  it("derives fallback windows and forbidden intervals when backend fields are omitted", () => {
    const minimalSchedule: RawPrayerData = {
      city: "Dhaka",
      timezone: "Asia/Dhaka",
      timings: sampleSchedule.timings,
    };
    const result = processPrayerSchedule(minimalSchedule);
    expect(result).not.toBeNull();
    expect(result!.waqts).toHaveLength(5);
    expect(result!.forbiddenIntervals).toHaveLength(3);
    expect(result!.waqts[0]!.range).toBe("04:46 – 06:02");
    expect(result!.forbiddenIntervals[1]!.range).toBe("11:32 – 11:42");
  });
});
