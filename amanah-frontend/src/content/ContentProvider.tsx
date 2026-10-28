import React, { createContext, useContext, useEffect, useState } from "react";
import * as Crypto from "expo-crypto";
import { useQuery } from "@tanstack/react-query";
import raw from "./bundle.json";
import lock from "./edition-lock.json";
import {
  contentSchema,
  validateStructure,
  type ContentBundle,
} from "./contract";
import { api, dataOf } from "../core/api/client";
export type { ContentBundle } from "./contract";
const Content = createContext<{
  bundle: ContentBundle | null;
  loading: boolean;
  compatible: boolean;
  error: string | null;
}>({ bundle: null, loading: true, compatible: false, error: null });
export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [bundle, setBundle] = useState<ContentBundle | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const catalog = useQuery({
    queryKey: ["content-edition"],
    queryFn: async () => dataOf(await api.GET("/v1/catalog")),
    retry: 1,
  });
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          JSON.stringify(raw.payload),
        );
        if (hash !== raw.sha256 || hash !== lock.sha256)
          throw Error("CONTENT_HASH_MISMATCH");
        const parsed = contentSchema.parse(raw);
        validateStructure(parsed, lock);
        for (let i = 0; i < raw.payload.surahs.length; i++)
          if (
            (await Crypto.digestStringAsync(
              Crypto.CryptoDigestAlgorithm.SHA256,
              JSON.stringify(raw.payload.surahs[i]),
            )) !== lock.surahHashes[i]
          )
            throw Error("CONTENT_SURAH_HASH_MISMATCH");
        if (alive) setBundle(parsed);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "CONTENT_INVALID");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const compatible =
    !!bundle &&
    catalog.data?.content.sha256 === bundle.sha256 &&
    catalog.data.content.edition === bundle.edition;
  return (
    <Content.Provider
      value={{
        bundle,
        loading,
        compatible,
        error:
          error ??
          (catalog.data && !compatible
            ? "The server and app editions differ. Update the app before saving reading progress."
            : null),
      }}
    >
      {children}
    </Content.Provider>
  );
}
export const useContent = () => useContext(Content);
