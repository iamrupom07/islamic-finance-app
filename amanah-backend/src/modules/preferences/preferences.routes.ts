import { z } from "zod";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import { publicUser } from "../identity/identity.schemas.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { preferenceView, preferenceInput } from "./preferences.schemas.js";
import { PreferencesService } from "./preferences.service.js";
export function preferencesRoutes(route: Register, ctx: Context) {
  const service = new PreferencesService(ctx);
  const catalogs = new CatalogService(ctx);
  const account = z.object({ user: publicUser, preferences: preferenceView });
  for (const path of ["/v1/me", "/v1/bootstrap"])
    route("GET", path, "Account", account, (req) =>
      service.account(req.actor.userId),
    );
  route(
    "PATCH",
    "/v1/me/preferences",
    "Account",
    preferenceView,
    (req) => service.update(req.actor.userId, preferenceInput.parse(req.body)),
    { body: preferenceInput },
  );
  const catalog = z.object({
    version: z.string(),
    currencies: z.array(z.string()),
    cities: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        country: z.string(),
        timezone: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      }),
    ),
    methods: z.array(z.object({ id: z.number(), name: z.string() })),
    policies: z.array(
      z.object({
        id: z.string(),
        version: z.string(),
        goldGrams: z.string(),
        silverGrams: z.string(),
        annualRate: z.string(),
        sourceNotes: z.string(),
      }),
    ),
    content: z.object({
      available: z.boolean(),
      sha256: z.string().nullable(),
    }),
    social: z.object({ google: z.boolean(), apple: z.boolean() }),
  });
  route("GET", "/v1/catalog", "Catalog", catalog, () => catalogs.get(), {
    public: true,
  });
  return service;
}
