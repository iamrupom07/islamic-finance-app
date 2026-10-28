import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
export const currencies = [
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "INR",
  "MYR",
  "CAD",
  "AUD",
] as const;
export const cities = [
  {
    id: "dhaka",
    name: "Dhaka",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    latitude: 23.8103,
    longitude: 90.4125,
  },
  {
    id: "khulna",
    name: "Khulna",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    latitude: 22.8456,
    longitude: 89.5403,
  },
  {
    id: "sylhet",
    name: "Sylhet",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    latitude: 24.8949,
    longitude: 91.8687,
  },
  {
    id: "chattogram",
    name: "Chattogram",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    latitude: 22.3569,
    longitude: 91.7832,
  },
  {
    id: "rajshahi",
    name: "Rajshahi",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    latitude: 24.3745,
    longitude: 88.6042,
  },
  {
    id: "barishal",
    name: "Barishal",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    latitude: 22.701,
    longitude: 90.3535,
  },
  {
    id: "rangpur",
    name: "Rangpur",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    latitude: 25.7439,
    longitude: 89.2752,
  },
  {
    id: "mymensingh",
    name: "Mymensingh",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    latitude: 24.7471,
    longitude: 90.4203,
  },
];
export const methods = [
  { id: 1, name: "University of Islamic Sciences, Karachi" },
  { id: 2, name: "Islamic Society of North America" },
  { id: 3, name: "Muslim World League" },
  { id: 4, name: "Umm Al-Qura University, Makkah" },
  { id: 5, name: "Egyptian General Authority of Survey" },
  { id: 7, name: "Institute of Geophysics, University of Tehran" },
  { id: 8, name: "Gulf Region" },
  { id: 13, name: "Diyanet İşleri Başkanlığı, Turkey" },
];
import { resolve, dirname, join } from "node:path";
import {
  contentSchema,
  validateStructure,
  type ContentBundle,
  type EditionLock,
} from "./content.contract.js";
const installed = new Map<string, ContentBundle>();
export type ContentPayload = ContentBundle["payload"];
export function loadContent(path = resolve("content/bundle.json")) {
  path ||= resolve("content/bundle.json");
  if (installed.has(path)) return installed.get(path)!;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (!raw.approved) return null;
  const lock = JSON.parse(
    readFileSync(join(dirname(path), "edition-lock.json"), "utf8"),
  ) as EditionLock;
  const hash = (data: unknown) =>
    createHash("sha256").update(JSON.stringify(data)).digest("hex");
  if (hash(raw.payload) !== raw.sha256 || raw.sha256 !== lock.sha256)
    throw Error("CONTENT_HASH_MISMATCH");
  const b = contentSchema.parse(raw);
  validateStructure(b, lock);
  if (
    raw.payload.surahs.some(
      (s: unknown, i: number) => hash(s) !== lock.surahHashes[i],
    )
  )
    throw Error("CONTENT_SURAH_HASH_MISMATCH");
  installed.set(path, b);
  return b;
}
export type Content = ReturnType<typeof loadContent>;

import type { Context } from "../../platform/context.js";
import { CatalogRepository } from "./catalog.repository.js";
export class CatalogService {
  private repo: CatalogRepository;
  private content: Content;
  constructor(private ctx: Context) {
    this.repo = new CatalogRepository(ctx.db);
    this.content = loadContent(ctx.env.CONTENT_BUNDLE_PATH);
  }
  async get() {
    return {
      version: "1",
      currencies: [...currencies],
      cities,
      methods,
      policies: (await this.repo.policies()).map((p) => ({
        ...p,
        goldGrams: p.goldGrams.toString(),
        silverGrams: p.silverGrams.toString(),
        annualRate: p.annualRate.toString(),
      })),
      content: {
        available: !!this.content,
        sha256: this.content?.sha256 ?? null,
        edition: this.content?.edition ?? null,
      },
      social: {
        google: !!this.ctx.env.GOOGLE_ALLOWED_CLIENT_IDS,
        apple: !!this.ctx.env.APPLE_ALLOWED_CLIENT_IDS,
      },
    };
  }
}
