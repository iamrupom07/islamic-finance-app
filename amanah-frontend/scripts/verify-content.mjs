import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const file =
  process.argv.find((s) => s.startsWith("--file="))?.slice(7) ??
  "src/content/bundle.json";
const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const lock = JSON.parse(
  fs.readFileSync(path.join(path.dirname(file), "edition-lock.json"), "utf8"),
);
const hash = (v) =>
  crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
if (
  raw.approved !== true ||
  raw.schemaVersion !== 2 ||
  raw.edition !== lock.edition ||
  hash(raw.payload) !== raw.sha256 ||
  raw.sha256 !== lock.sha256
)
  throw Error("CONTENT_HASH_OR_EDITION_INVALID");
if (
  !raw.notice ||
  !raw.reviewedBy ||
  !raw.license ||
  !raw.source.startsWith("https://")
)
  throw Error("CONTENT_PROVENANCE_MISSING");
if (
  lock.verseCounts.length !== 114 ||
  lock.verseCounts.reduce((a, b) => a + b, 0) !== 6236 ||
  raw.payload.surahs.length !== 114
)
  throw Error("CONTENT_INCOMPLETE");
for (const [i, s] of raw.payload.surahs.entries()) {
  if (
    s.number !== i + 1 ||
    s.verses.length !== lock.verseCounts[i] ||
    hash(s) !== lock.surahHashes[i] ||
    s.verses.some(
      (v, j) =>
        v.number !== j + 1 ||
        !v.arabic ||
        raw.payload.translations.some((t) => !v.translations[t.id]?.text),
    )
  )
    throw Error("CONTENT_VERSE_INTEGRITY_FAILED");
}
const ids = raw.payload.duas.map((d) => d.id);
if (
  new Set(ids).size !== ids.length ||
  JSON.stringify(ids) !== JSON.stringify(lock.duaIds)
)
  throw Error("DUA_IDS_INVALID");
if (raw.payload.juz.length !== 30) throw Error("JUZ_INCOMPLETE");
for (const d of raw.payload.duas) {
  if (!d.reference || !d.source || !Array.isArray(d.parts) || !d.context)
    throw Error("DUA_PROVENANCE_INVALID");
  for (const t of d.recordings ?? [])
    if (t.streamAllowed !== true || !t.rights || !t.edition)
      throw Error("AUDIO_RIGHTS_MISSING");
}
console.log(
  `Verified ${raw.payload.surahs.length} surahs / 6236 verses, ${ids.length} source dua entries, ${raw.payload.juz.length} Juz starts. Edition ${raw.edition}; SHA256 ${raw.sha256}. Publisher provenance is retained; independent release approval remains required.`,
);
