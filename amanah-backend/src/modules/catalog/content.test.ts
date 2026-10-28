import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { loadContent } from "./catalog.service.js";
import {
  contentSchema,
  validateStructure,
  quranTrack,
} from "./content.contract.js";
const raw = JSON.parse(readFileSync("content/bundle.json", "utf8"));
const lock = JSON.parse(readFileSync("content/edition-lock.json", "utf8"));
describe("installed publisher edition", () => {
  it("opens all complete surahs and all Juz starts with both Hafs reciters", () => {
    const b = loadContent()!;
    expect(b.payload.surahs).toHaveLength(114);
    expect(b.payload.surahs.reduce((sum, s) => sum + s.verses.length, 0)).toBe(
      6236,
    );
    expect(b.payload.surahs[1]!.verses).toHaveLength(286);
    expect(b.payload.surahs[113]!.verses).toHaveLength(6);
    expect(b.payload.juz).toHaveLength(30);
    for (const rec of b.payload.reciters)
      for (let s = 1; s <= 114; s++)
        expect(quranTrack(b, s, rec.id).url).toMatch(/https:.*\/\d{3}\.mp3$/);
  });
  it("rejects text tampering against the independent lock", () => {
    const dir = mkdtempSync(join(tmpdir(), "amanah-content-"));
    try {
      const edited = structuredClone(raw);
      edited.payload.surahs[0].verses[0].arabic = "UNVERIFIED";
      writeFileSync(join(dir, "bundle.json"), JSON.stringify(edited));
      writeFileSync(join(dir, "edition-lock.json"), JSON.stringify(lock));
      expect(() => loadContent(join(dir, "bundle.json"))).toThrow(
        "CONTENT_HASH_MISMATCH",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects incomplete surahs even if a new checksum is supplied", () => {
    const b = contentSchema.parse(structuredClone(raw));
    b.payload.surahs[1]!.verses.pop();
    const sha256 = createHash("sha256")
      .update(JSON.stringify(b.payload))
      .digest("hex");
    b.sha256 = sha256;
    expect(() => validateStructure(b, { ...lock, sha256 })).toThrow(
      "CONTENT_STRUCTURE_INVALID",
    );
  });
  it("rejects duplicate dua identifiers, wrong editions, bad verse numbering and Juz order", () => {
    const b = contentSchema.parse(raw);
    expect(() =>
      validateStructure({ ...b, edition: "different" }, lock),
    ).toThrow();
    const duplicate = structuredClone(b);
    duplicate.payload.duas[1]!.id = duplicate.payload.duas[0]!.id;
    expect(() => validateStructure(duplicate, lock)).toThrow(
      "CONTENT_IDS_INVALID",
    );
    const bad = structuredClone(b);
    bad.payload.surahs[0]!.verses[0]!.number = 2;
    expect(() => validateStructure(bad, lock)).toThrow();
    const juz = structuredClone(b);
    juz.payload.juz[1] = juz.payload.juz[0]!;
    expect(() => validateStructure(juz, lock)).toThrow("JUZ_STRUCTURE_INVALID");
  });
  it("preserves separate source instructions, nested repetitions and missing audio rights", () => {
    const b = loadContent()!;
    expect(b.payload.duas).toHaveLength(267);
    expect(
      b.payload.duas.some((d) => d.parts.some((p) => p.repetitions === 33)),
    ).toBe(true);
    expect(
      b.payload.duas.some((d) =>
        JSON.stringify(d.context).includes('"type":"repeat"'),
      ),
    ).toBe(true);
    expect(
      b.payload.duas.every(
        (d) => !d.recordings?.length && !!d.audioUnavailableReason,
      ),
    ).toBe(true);
  });
});
