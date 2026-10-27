import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import { prayerQuery, prayerSchedule } from "./prayer.schemas.js";
import { PrayerService } from "./prayer.service.js";
export function prayerRoutes(route: Register, ctx: Context) {
  const s = new PrayerService(ctx);
  route(
    "GET",
    "/v1/prayer/today",
    "Prayer",
    prayerSchedule,
    (req) => s.today(req.actor.userId, prayerQuery.parse(req.query).date),
    { querystring: prayerQuery },
  );
  return s;
}
