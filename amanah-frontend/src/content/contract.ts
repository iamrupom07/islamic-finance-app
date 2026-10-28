import { z } from "zod";
export const trackSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  title: z.string().min(1),
  artist: z.string().min(1),
  url: z.url().startsWith("https://"),
  edition: z.string().min(1),
  rights: z.url().startsWith("https://"),
  streamAllowed: z.literal(true),
  downloadAllowed: z.boolean(),
  kind: z.enum(["QURAN", "DUA"]),
  surah: z.number().int().min(1).max(114).optional(),
  ayah: z.number().int().positive().optional(),
  duaId: z.string().optional(),
});
export type Track = z.infer<typeof trackSchema>;
const text = z.object({ text: z.string().min(1), footnotes: z.string() });
export const contentSchema = z.object({
  approved: z.literal(true),
  schemaVersion: z.literal(2),
  source: z.url(),
  edition: z.string().min(1),
  license: z.string().min(1),
  reviewedBy: z.string().min(1),
  notice: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.object({
    surahs: z.array(
      z.object({
        number: z.number().int(),
        name: z.string().min(1),
        arabicName: z.string().min(1),
        verses: z.array(
          z.object({
            number: z.number().int(),
            arabic: z.string().min(1),
            translation: z.string().optional(),
            translations: z.record(z.string(), text),
          }),
        ),
      }),
    ),
    juz: z.array(
      z.object({
        number: z.number().int(),
        surah: z.number().int(),
        ayah: z.number().int(),
      }),
    ),
    translations: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        language: z.string(),
        version: z.string(),
        source: z.url(),
        rights: z.url(),
        transcript: z.string(),
      }),
    ),
    reciters: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        baseUrl: z.url().startsWith("https://"),
        edition: z.string(),
        source: z.url(),
        rights: z.url(),
        streamAllowed: z.literal(true),
        downloadAllowed: z.boolean(),
      }),
    ),
    duas: z.array(
      z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
        category: z.string(),
        title: z.string(),
        arabic: z.string(),
        translation: z.string(),
        transliteration: z.string().optional(),
        reference: z.string(),
        source: z.url(),
        audioUnavailableReason: z.string().optional(),
        parts: z.array(
          z.object({
            id: z.string(),
            arabic: z.string(),
            translation: z.string(),
            transliteration: z.string().optional(),
            variation: z.string(),
            repetitions: z.number().int().positive().nullable(),
          }),
        ),
        context: z.unknown(),
        recordings: z.array(trackSchema).optional(),
      }),
    ),
  }),
});
export type ContentBundle = z.infer<typeof contentSchema>;
export type EditionLock = {
  edition: string;
  sha256: string;
  verseCounts: number[];
  surahHashes: string[];
  duaIds: string[];
};
const canonicalCounts = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];
export function validateStructure(b: ContentBundle, lock: EditionLock) {
  if (JSON.stringify(lock.verseCounts) !== JSON.stringify(canonicalCounts))
    throw Error("CONTENT_NUMBERING_UNSUPPORTED");
  if (b.edition !== lock.edition || b.sha256 !== lock.sha256)
    throw Error("CONTENT_EDITION_MISMATCH");
  if (
    b.payload.surahs.length !== 114 ||
    lock.verseCounts.length !== 114 ||
    lock.surahHashes.length !== 114 ||
    b.payload.surahs.some(
      (s, i) =>
        s.number !== i + 1 ||
        s.verses.length !== lock.verseCounts[i] ||
        s.verses.some(
          (v, j) =>
            v.number !== j + 1 ||
            b.payload.translations.some((t) => !v.translations[t.id]),
        ),
    )
  )
    throw Error("CONTENT_STRUCTURE_INVALID");
  const ids = b.payload.duas.map((d) => d.id);
  if (
    new Set(ids).size !== ids.length ||
    JSON.stringify(ids) !== JSON.stringify(lock.duaIds)
  )
    throw Error("CONTENT_IDS_INVALID");
  if (
    new Set(b.payload.translations.map((t) => t.id)).size !==
    b.payload.translations.length
  )
    throw Error("TRANSLATION_IDS_INVALID");
  const juz = b.payload.juz;
  if (
    juz.length !== 30 ||
    juz.some(
      (j, i) =>
        j.number !== i + 1 ||
        j.surah < 1 ||
        j.surah > 114 ||
        j.ayah < 1 ||
        j.ayah > lock.verseCounts[j.surah - 1]! ||
        (i > 0 &&
          (j.surah < juz[i - 1]!.surah ||
            (j.surah === juz[i - 1]!.surah && j.ayah <= juz[i - 1]!.ayah))),
    )
  )
    throw Error("JUZ_STRUCTURE_INVALID");
}
export function quranTrack(
  b: ContentBundle,
  surah: number,
  reciterId: string,
): Track {
  const rec = b.payload.reciters.find((r) => r.id === reciterId);
  if (!rec || !b.payload.surahs[surah - 1]) throw Error("TRACK_UNAVAILABLE");
  return trackSchema.parse({
    id: `quran-${rec.id}-${surah}`,
    title: b.payload.surahs[surah - 1]!.name,
    artist: rec.name,
    url: rec.baseUrl + String(surah).padStart(3, "0") + ".mp3",
    edition: b.edition,
    rights: rec.rights,
    streamAllowed: rec.streamAllowed,
    downloadAllowed: rec.downloadAllowed,
    kind: "QURAN",
    surah,
  });
}
export function quranVerseTrack(
  b: ContentBundle,
  surah: number,
  ayah: number,
  reciterId = "1",
): Track {
  const rec =
    b.payload.reciters.find((r) => r.id === reciterId) ??
    b.payload.reciters[0]!;
  const s = b.payload.surahs[surah - 1];
  if (!s || !s.verses[ayah - 1]) throw Error("TRACK_UNAVAILABLE");
  const sNum = String(surah).padStart(3, "0");
  const aNum = String(ayah).padStart(3, "0");
  return trackSchema.parse({
    id: `quran-${rec.id}-${surah}-${ayah}`,
    title: `${s.name} · Ayah ${ayah}`,
    artist: rec.name,
    url: `https://everyayah.com/data/Ibrahim_Akhdar_32kbps/${sNum}${aNum}.mp3`,
    edition: b.edition,
    rights: rec.rights,
    streamAllowed: true,
    downloadAllowed: true,
    kind: "QURAN",
    surah,
    ayah,
  });
}
