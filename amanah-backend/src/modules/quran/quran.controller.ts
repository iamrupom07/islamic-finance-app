import type { FastifyRequest } from "fastify";
import { verseRef, readingInput } from "./quran.schemas.js";
import type { QuranService } from "./quran.service.js";
export const quranController = (s: QuranService) => ({
  progress: (r: FastifyRequest) => s.progress(r.actor.userId),
  bookmarks: (r: FastifyRequest) => s.bookmarks(r.actor.userId),
  saveProgress: (r: FastifyRequest) =>
    s.saveProgress(r.actor.userId, readingInput.parse(r.body)),
  bookmark: (r: FastifyRequest) =>
    s.bookmark(r.actor.userId, verseRef.parse(r.params)),
  remove: (r: FastifyRequest) =>
    s.remove(r.actor.userId, verseRef.parse(r.params)),
});
