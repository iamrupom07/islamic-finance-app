export type Reminder = {
  id: string;
  at: string;
  title: string;
  body: string;
  url: string;
};
export function prayerReminderPlan(
  days: {
    date: string;
    isStale: boolean;
    timings: { name: string; at: string }[];
  }[],
  selected: readonly string[],
  now = new Date(),
): Reminder[] {
  return days
    .flatMap((day) =>
      day.isStale
        ? []
        : day.timings
            .filter(
              (t) =>
                selected.includes(t.name) &&
                t.name !== "Sunrise" &&
                new Date(t.at) > now,
            )
            .map((t) => ({
              id: `prayer:${day.date}:${t.name}`,
              at: t.at,
              title: "Amanah",
              body: `Time for ${t.name}. Check your local mosque schedule.`,
              url: "/prayer",
            })),
    )
    .slice(0, 40);
}
