import { z } from "zod";
import type { Context } from "../../platform/context.js";
import type { Register } from "../../platform/http/routes.js";
import { ok } from "../../platform/http/schemas.js";
import {
  verseRef,
  readingInput,
  readingView,
  bookmarkView,
} from "./quran.schemas.js";
import { QuranService } from "./quran.service.js";
import { quranController } from "./quran.controller.js";
export function quranRoutes(route: Register, ctx: Context) {
  const c = quranController(new QuranService(ctx));
  route(
    "GET",
    "/v1/quran/progress",
    "Quran",
    readingView.nullable(),
    c.progress,
  );
  route("PUT", "/v1/quran/progress", "Quran", readingView, c.saveProgress, {
    body: readingInput,
  });
  route(
    "GET",
    "/v1/quran/bookmarks",
    "Quran",
    z.array(bookmarkView),
    c.bookmarks,
  );
  route("PUT", "/v1/quran/bookmarks/:surah/:ayah", "Quran", ok, c.bookmark, {
    params: verseRef,
  });
  route("DELETE", "/v1/quran/bookmarks/:surah/:ayah", "Quran", ok, c.remove, {
    params: verseRef,
  });
}
