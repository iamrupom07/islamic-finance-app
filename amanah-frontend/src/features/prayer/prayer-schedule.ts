export interface PrayerWaqt {
  name: "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
  startAt: string;
  endAt: string;
  startTime: string;
  endTime: string;
  range: string;
  isActive: boolean;
  isNext: boolean;
  remainingMs: number;
  remainingFormatted: string;
}

export interface ForbiddenInterval {
  name: "Sunrise" | "Solar zenith" | "Sunset";
  title: string;
  startAt: string;
  endAt: string;
  startTime: string;
  endTime: string;
  range: string;
  isActive: boolean;
  remainingMs: number;
  remainingFormatted: string;
  explanation: string;
}

export interface ProcessedPrayerSchedule {
  city: string;
  timezone: string;
  date: string;
  hijriDate: string;
  waqts: PrayerWaqt[];
  activeWaqt: PrayerWaqt | null;
  nextPrayer: {
    name: string;
    at: string;
    time: string;
    remainingMs: number;
    remainingFormatted: string;
  } | null;
  forbiddenIntervals: ForbiddenInterval[];
  activeForbidden: ForbiddenInterval | null;
}

export interface RawPrayerData {
  city?: string;
  timezone?: string;
  date?: string;
  hijriDate?: string;
  timings?: {
    name: "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha" | string;
    at: string;
    label?: string;
  }[];
  windows?: {
    name: string;
    start: string;
    end: string;
  }[];
  previousNightIsha?: {
    name: string;
    start: string;
    end: string;
  } | null;
  forbiddenIntervals?: {
    name: string;
    start: string;
    end: string;
    explanation?: string;
  }[];
  nextPrayer?: {
    name: string;
    at: string;
    label?: string;
  } | null;
  solarEvents?: {
    sunriseAt: string;
    sunsetAt: string;
  } | null;
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSec % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSec % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function formatTime24(date: Date, timezone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(date);
  } catch {
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
}

export function formatIsoTime(iso: string, timezone?: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    const match = iso.match(/T(\d{2}:\d{2})/);
    return match ? match[1]! : "";
  }
  return formatTime24(d, timezone);
}

export function processPrayerSchedule(
  data: RawPrayerData | null | undefined,
  now: Date = new Date(),
): ProcessedPrayerSchedule | null {
  if (!data || !data.timings || data.timings.length === 0) return null;

  const tz = data.timezone || "Asia/Dhaka";
  const nowMs = now.getTime();

  // Find timings
  const timingMap = new Map<string, { at: string; label?: string }>();
  for (const t of data.timings) {
    timingMap.set(t.name, t);
  }

  const fajrT = timingMap.get("Fajr");
  const sunriseT = timingMap.get("Sunrise");
  const dhuhrT = timingMap.get("Dhuhr");
  const asrT = timingMap.get("Asr");
  const maghribT = timingMap.get("Maghrib");
  const ishaT = timingMap.get("Isha");

  if (!fajrT || !dhuhrT || !asrT || !maghribT || !ishaT) return null;

  // Window map from backend if available
  const windowMap = new Map<string, { start: string; end: string }>();
  if (data.windows && data.windows.length > 0) {
    for (const w of data.windows) {
      windowMap.set(w.name, w);
    }
  }

  // Derive 5 daily waqts
  const prayerNames: ("Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha")[] = [
    "Fajr",
    "Dhuhr",
    "Asr",
    "Maghrib",
    "Isha",
  ];

  const waqts: PrayerWaqt[] = prayerNames.map((name) => {
    let startIso = "";
    let endIso = "";

    const backendWin = windowMap.get(name);
    if (backendWin) {
      startIso = backendWin.start;
      endIso = backendWin.end;
    } else {
      switch (name) {
        case "Fajr":
          startIso = fajrT.at;
          endIso =
            sunriseT?.at ??
            new Date(new Date(fajrT.at).getTime() + 76 * 60000).toISOString();
          break;
        case "Dhuhr":
          startIso = dhuhrT.at;
          endIso = asrT.at;
          break;
        case "Asr":
          startIso = asrT.at;
          endIso = maghribT.at;
          break;
        case "Maghrib":
          startIso = maghribT.at;
          endIso = ishaT.at;
          break;
        case "Isha":
          startIso = ishaT.at;
          // Isha ends at next day's Fajr (~24h from today's Fajr)
          endIso = new Date(
            new Date(fajrT.at).getTime() + 86400000,
          ).toISOString();
          break;
      }
    }

    const startDate = new Date(startIso);
    const endDate = new Date(endIso);
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    // Check if active (handle overnight Isha if current time is before Fajr of today)
    let isActive = false;
    if (name === "Isha") {
      // Isha is active if:
      // a) now >= ishaStart and now < ishaEnd (evening of current day)
      // b) now < today's fajrStart and previousNightIsha matches or now < fajrStart
      if (nowMs >= startMs && nowMs < endMs) {
        isActive = true;
      } else if (fajrT && nowMs < new Date(fajrT.at).getTime()) {
        // Between midnight and Fajr
        isActive = true;
      }
    } else {
      isActive = nowMs >= startMs && nowMs < endMs;
    }

    const remainingMs = isActive
      ? name === "Isha" && nowMs < new Date(fajrT.at).getTime()
        ? Math.max(0, new Date(fajrT.at).getTime() - nowMs)
        : Math.max(0, endMs - nowMs)
      : 0;

    const startTime = formatIsoTime(startIso, tz);
    const endTime = formatIsoTime(endIso, tz);

    return {
      name,
      startAt: startIso,
      endAt: endIso,
      startTime,
      endTime,
      range: `${startTime} – ${endTime}`,
      isActive,
      isNext: false,
      remainingMs,
      remainingFormatted: formatCountdown(remainingMs),
    };
  });

  // Find active waqt
  const activeWaqt = waqts.find((w) => w.isActive) ?? null;

  // Determine next prayer
  let nextPrayerInfo: ProcessedPrayerSchedule["nextPrayer"];
  if (data.nextPrayer && data.nextPrayer.at) {
    const nextAt = new Date(data.nextPrayer.at);
    const diff = Math.max(0, nextAt.getTime() - nowMs);
    nextPrayerInfo = {
      name: data.nextPrayer.name,
      at: data.nextPrayer.at,
      time: formatIsoTime(data.nextPrayer.at, tz),
      remainingMs: diff,
      remainingFormatted: formatCountdown(diff),
    };
  } else {
    // Find next upcoming waqt
    const upcoming = waqts.find((w) => new Date(w.startAt).getTime() > nowMs);
    if (upcoming) {
      const diff = Math.max(0, new Date(upcoming.startAt).getTime() - nowMs);
      nextPrayerInfo = {
        name: upcoming.name,
        at: upcoming.startAt,
        time: upcoming.startTime,
        remainingMs: diff,
        remainingFormatted: formatCountdown(diff),
      };
    } else {
      // Tomorrow Fajr
      const tomorrowFajrMs = new Date(fajrT.at).getTime() + 86400000;
      const diff = Math.max(0, tomorrowFajrMs - nowMs);
      nextPrayerInfo = {
        name: "Fajr",
        at: new Date(tomorrowFajrMs).toISOString(),
        time: formatIsoTime(fajrT.at, tz),
        remainingMs: diff,
        remainingFormatted: formatCountdown(diff),
      };
    }
  }

  // Mark isNext on waqts
  if (nextPrayerInfo) {
    for (const w of waqts) {
      if (w.name.toLowerCase() === nextPrayerInfo.name.toLowerCase()) {
        w.isNext = true;
      }
    }
  }

  // 3 Forbidden Intervals
  const defaultExplanations = {
    Sunrise:
      "Voluntary prayer is prohibited while the sun is rising until it rises high (~15 min).",
    "Solar zenith":
      "Voluntary prayer is prohibited when the sun is at its zenith until Dhuhr begins (~10 min).",
    Sunset:
      "Voluntary prayer is prohibited while the sun sets until Maghrib begins (~15 min).",
  };

  const forbiddenDefinitions = [
    {
      name: "Sunrise" as const,
      title: "Sunrise interval (সূর্যোদয়)",
      getStart: () =>
        sunriseT?.at ??
        new Date(new Date(fajrT.at).getTime() + 76 * 60000).toISOString(),
      getEnd: (start: string) =>
        new Date(new Date(start).getTime() + 15 * 60000).toISOString(),
      explanation: defaultExplanations.Sunrise,
    },
    {
      name: "Solar zenith" as const,
      title: "Solar zenith / Zawal (দ্বিপ্রহর)",
      getStart: () =>
        new Date(new Date(dhuhrT.at).getTime() - 10 * 60000).toISOString(),
      getEnd: () => dhuhrT.at,
      explanation: defaultExplanations["Solar zenith"],
    },
    {
      name: "Sunset" as const,
      title: "Sunset interval (সূর্যাস্ত)",
      getStart: () => {
        const sunsetIso = data.solarEvents?.sunsetAt ?? maghribT.at;
        return new Date(
          new Date(sunsetIso).getTime() - 15 * 60000,
        ).toISOString();
      },
      getEnd: () => data.solarEvents?.sunsetAt ?? maghribT.at,
      explanation: defaultExplanations.Sunset,
    },
  ];

  const forbiddenMap = new Map<
    string,
    { start: string; end: string; explanation?: string }
  >();
  if (data.forbiddenIntervals && data.forbiddenIntervals.length > 0) {
    for (const f of data.forbiddenIntervals) {
      forbiddenMap.set(f.name, f);
    }
  }

  const forbiddenIntervals: ForbiddenInterval[] = forbiddenDefinitions.map(
    (def) => {
      let startIso: string;
      let endIso: string;
      let explanation = def.explanation;

      const fromBackend = forbiddenMap.get(def.name);
      if (fromBackend) {
        startIso = fromBackend.start;
        endIso = fromBackend.end;
        if (fromBackend.explanation) {
          explanation = fromBackend.explanation;
        }
      } else {
        startIso = def.getStart();
        endIso = def.getEnd(startIso);
      }

      const startDate = new Date(startIso);
      const endDate = new Date(endIso);
      const startMs = startDate.getTime();
      const endMs = endDate.getTime();

      const isActive = nowMs >= startMs && nowMs < endMs;
      const remainingMs = isActive ? Math.max(0, endMs - nowMs) : 0;

      const startTime = formatIsoTime(startIso, tz);
      const endTime = formatIsoTime(endIso, tz);

      return {
        name: def.name,
        title: def.title,
        startAt: startIso,
        endAt: endIso,
        startTime,
        endTime,
        range: `${startTime} – ${endTime}`,
        isActive,
        remainingMs,
        remainingFormatted: formatCountdown(remainingMs),
        explanation,
      };
    },
  );

  const activeForbidden = forbiddenIntervals.find((f) => f.isActive) ?? null;

  return {
    city: data.city || "Dhaka",
    timezone: tz,
    date: data.date || "",
    hijriDate: data.hijriDate || "",
    waqts,
    activeWaqt,
    nextPrayer: nextPrayerInfo,
    forbiddenIntervals,
    activeForbidden,
  };
}
