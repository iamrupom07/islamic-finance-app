import { loadContent } from "../src/modules/catalog/catalog.service.js";
import { ProviderHttp } from "../src/platform/providers/http.js";
import { z } from "zod";
const content = loadContent();
if (!content) throw Error("CONTENT_UNAVAILABLE");
const response = z
  .object({
    translations: z.array(z.object({ key: z.string(), version: z.string() })),
  })
  .parse(
    await new ProviderHttp(10000).json(
      "https://quranenc.com/api/v1/translations/list",
    ),
  );
for (const t of content.payload.translations) {
  const current = response.translations.find((v) => v.key === t.id);
  if (!current || current.version !== t.version)
    throw Error(
      "CONTENT_REVIEW_REQUIRED: " +
        t.id +
        " publisher version differs. Import and review a new immutable edition; do not relabel old text.",
    );
}
console.log(
  "Installed translation versions match the publisher. Tanzil updates and content/audio rights still require periodic source review.",
);
