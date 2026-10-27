import React, { createContext, useContext, useEffect, useState } from "react";
import { z } from "zod";
import * as Crypto from "expo-crypto";
import raw from "./bundle.json";
const schema = z.object({
  approved: z.literal(true),
  source: z.url(),
  edition: z.string().min(1),
  license: z.string().min(1),
  reviewedBy: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.object({
    surahs: z.array(
      z.object({
        number: z.number().int(),
        name: z.string(),
        arabicName: z.string(),
        verses: z.array(
          z.object({
            number: z.number().int(),
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
  }),
});
export type ContentBundle = z.infer<typeof schema>;
const Content = createContext<{
  bundle: ContentBundle | null;
  loading: boolean;
}>({ bundle: null, loading: true });
export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [bundle, setBundle] = useState<ContentBundle | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const b = schema.parse(raw);
        if (
          b.payload.surahs.length !== 114 ||
          b.payload.surahs.some(
            (s, i) =>
              s.number !== i + 1 ||
              !s.verses.length ||
              s.verses.some((v, j) => v.number !== j + 1),
          )
        )
          return;
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          JSON.stringify(b.payload),
        );
        if (hash === b.sha256 && alive) setBundle(b);
      } catch {
        /* Unapproved text is never rendered. */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Content.Provider value={{ bundle, loading }}>{children}</Content.Provider>
  );
}
export const useContent = () => useContext(Content);
