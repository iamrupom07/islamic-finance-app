import fs from "node:fs";
import crypto from "node:crypto";
const path =
  process.argv.find((s) => s.startsWith("--file="))?.slice(7) ??
  "src/content/bundle.json";
const b = JSON.parse(fs.readFileSync(path, "utf8"));
if (!b.approved) {
  if (process.argv.includes("--release")) {
    console.error(
      "BLOCKED: approved religious content is required for release.",
    );
    process.exit(1);
  }
  console.log(
    "Content unavailable by design: no unapproved text will be rendered.",
  );
  process.exit(0);
}
for (const key of ["source", "edition", "license", "reviewedBy", "sha256"])
  if (typeof b[key] !== "string" || !b[key]) throw Error("Missing " + key);
if (!b.source.startsWith("https://"))
  throw Error("Source must be an HTTPS provenance URL.");
if (
  crypto
    .createHash("sha256")
    .update(JSON.stringify(b.payload))
    .digest("hex") !== b.sha256
)
  throw Error("CONTENT_HASH_MISMATCH");
if (
  b.payload.surahs.length !== 114 ||
  b.payload.surahs.some(
    (s, i) =>
      s.number !== i + 1 ||
      !s.name ||
      !s.arabicName ||
      !s.verses.length ||
      s.verses.some((v, j) => v.number !== j + 1 || !v.arabic),
  )
)
  throw Error("CONTENT_STRUCTURE_INVALID");
if (
  new Set(b.payload.duas.map((d) => d.id)).size !== b.payload.duas.length ||
  b.payload.duas.some(
    (d) =>
      !d.arabic ||
      !d.translation ||
      !d.reference ||
      !d.title ||
      !d.category ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(d.id),
  )
)
  throw Error("DUA_STRUCTURE_INVALID");
console.log(
  "Content structure, provenance metadata and SHA256 verified. Human textual accuracy and redistribution approval must be evidenced separately.",
);
