import { z } from "zod";
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
const contentPayload = z.object({
  surahs: z.array(
    z.object({
      number: z.number().int().min(1).max(114),
      name: z.string(),
      arabicName: z.string(),
      verses: z.array(
        z.object({
          number: z.number().int().positive(),
          arabic: z.string().min(1),
          translation: z.string().optional(),
        }),
      ),
    }),
  ),
  duas: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      title: z.string(),
      arabic: z.string().min(1),
      translation: z.string(),
      transliteration: z.string().optional(),
      reference: z.string(),
    }),
  ),
});
const bundle = z.object({
  approved: z.literal(true),
  source: z.url(),
  edition: z.string().min(1),
  license: z.string().min(1),
  reviewedBy: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  payload: contentPayload,
});
export type ContentPayload = z.infer<typeof contentPayload>;
export function loadContent(path?: string) {
  if (!path) return null;
  const b = bundle.parse(JSON.parse(readFileSync(path, "utf8")));
  if (
    createHash("sha256").update(JSON.stringify(b.payload)).digest("hex") !==
    b.sha256
  )
    throw new Error("CONTENT_HASH_MISMATCH");
  if (
    b.payload.surahs.length !== 114 ||
    b.payload.surahs.some(
      (s, i) =>
        s.number !== i + 1 ||
        s.verses.length === 0 ||
        s.verses.some((a, j) => a.number !== j + 1),
    )
  )
    throw new Error("CONTENT_STRUCTURE_INVALID");
  if (new Set(b.payload.duas.map((d) => d.id)).size !== b.payload.duas.length)
    throw new Error("CONTENT_IDS_DUPLICATE");
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
      },
      social: {
        google: !!this.ctx.env.GOOGLE_ALLOWED_CLIENT_IDS,
        apple: !!this.ctx.env.APPLE_ALLOWED_CLIENT_IDS,
      },
    };
  }
}
