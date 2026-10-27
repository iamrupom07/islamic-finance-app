import fs from "node:fs";
import path from "node:path";
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((f) =>
      f.isDirectory()
        ? files(path.join(dir, f.name))
        : [path.join(dir, f.name)],
    );
}
const routes = files("src/app")
  .filter((f) => f.endsWith(".tsx") && !f.endsWith("_layout.tsx"))
  .map(
    (f) =>
      "/" +
      f
        .slice("src/app/".length)
        .replace(/\([^/]+\)\//g, "")
        .replace(/\.tsx$/, "")
        .replace(/(^|\/)index$/, ""),
  )
  .map((s) => (s === "/" ? s : s.replace(/\/$/, "")));
if (new Set(routes).size !== routes.length)
  throw Error("Duplicate URL routes: " + routes.join(", "));
for (const required of [
  "/home",
  "/finance",
  "/quran",
  "/dua",
  "/profile",
  "/login",
  "/register",
  "/verify-email",
  "/reset-password",
  "/complete-reset",
  "/permissions",
  "/currency",
  "/nisab",
  "/prayer-preferences",
  "/city",
  "/transactions",
  "/transactions/new",
  "/transactions/[id]",
  "/assets",
  "/assets/new",
  "/assets/[id]",
  "/debts",
  "/debts/new",
  "/debts/[id]",
  "/zakat",
  "/zakat/record-payment",
  "/zakat/success",
  "/zakat/history",
  "/zakat/history/[id]",
  "/prayer",
  "/quran/[surah]",
  "/quran/bookmarks",
  "/dua/[category]",
  "/dua/detail/[id]",
  "/dua/favorites",
  "/settings/currency",
  "/settings/nisab",
  "/settings/appearance",
  "/settings/language",
  "/settings/location",
  "/settings/notification",
  "/settings/export",
  "/settings/about",
  "/settings/delete-account",
])
  if (!routes.includes(required)) throw Error("Missing route " + required);
for (const item of JSON.parse(
  fs.readFileSync("docs/SCREEN_COVERAGE.json", "utf8"),
))
  if (!fs.existsSync(item.implementation))
    throw Error("Missing mapped implementation " + item.promptId);
console.log(
  `${routes.length} unique route destinations; all required destinations and source screen mappings resolve.`,
);
