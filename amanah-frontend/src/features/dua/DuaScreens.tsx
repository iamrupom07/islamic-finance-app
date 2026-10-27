import React, { useState } from "react";
import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Card,
  Copy,
  Field,
  ActionRow,
  Button,
  QueryState,
  Empty,
  ErrorRetry,
  useToast,
} from "../../design-system/components";
import { api, dataOf } from "../../core/api/client";
import { useAccountQuery, useAccountMutation } from "../../core/api/hooks";
import { useContent } from "../../content/ContentProvider";
import { ContentUnavailable } from "../quran/QuranScreens";
export function DuaScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const [search, setSearch] = useState("");
  const categories = [
    ...new Set(bundle?.payload.duas.map((d) => d.category) ?? []),
  ];
  return (
    <Screen title="Dua" tabs>
      <Button
        secondary
        label="Favorites"
        onPress={() => router.push("/dua/favorites")}
      />
      {!bundle ? (
        <ContentUnavailable />
      ) : (
        <>
          <Field label="Search" value={search} onChangeText={setSearch} />
          {search ? (
            bundle.payload.duas
              .filter((d) =>
                `${d.title} ${d.translation}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((d) => (
                <Card key={d.id}>
                  <ActionRow
                    label={d.title}
                    onPress={() =>
                      router.push(`/dua/detail/${encodeURIComponent(d.id)}`)
                    }
                  />
                </Card>
              ))
          ) : categories.length ? (
            categories.map((c) => (
              <Card key={c}>
                <ActionRow
                  label={c}
                  onPress={() => router.push(`/dua/${encodeURIComponent(c)}`)}
                />
              </Card>
            ))
          ) : (
            <Empty message="No approved duas are included in this edition." />
          )}
        </>
      )}
    </Screen>
  );
}
export function DuaCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { bundle } = useContent();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const rows = bundle?.payload.duas.filter(
    (d) =>
      d.category === category &&
      d.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Screen title={category} back>
      {!bundle ? (
        <ContentUnavailable />
      ) : (
        <>
          <Field label="Search" value={search} onChangeText={setSearch} />
          {rows?.length ? (
            rows.map((d) => (
              <Card key={d.id}>
                <ActionRow
                  label={d.title}
                  onPress={() =>
                    router.push(`/dua/detail/${encodeURIComponent(d.id)}`)
                  }
                />
                <Copy
                  size={24}
                  style={{
                    fontFamily: "Arabic",
                    textAlign: "right",
                    writingDirection: "rtl",
                  }}
                >
                  {d.arabic}
                </Copy>
              </Card>
            ))
          ) : (
            <Empty message="No matching duas." />
          )}
        </>
      )}
    </Screen>
  );
}
export function DuaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bundle } = useContent();
  const d = bundle?.payload.duas.find((d) => d.id === id);
  const toast = useToast();
  const [error, setError] = useState<unknown>(null);
  const q = useAccountQuery(["dua-favorites"], async () =>
    dataOf(await api.GET("/v1/dua/favorites")),
  );
  const favorite = !!q.data?.some((f) => f.duaId === id);
  const mutation = useAccountMutation(async () => {
    if (favorite)
      await api.DELETE("/v1/dua/favorites/{duaId}", {
        params: { path: { duaId: id } },
      });
    else
      await api.PUT("/v1/dua/favorites/{duaId}", {
        params: { path: { duaId: id } },
      });
  });
  const text = d
    ? [
        d.title,
        d.arabic,
        d.transliteration,
        d.translation,
        d.reference,
        bundle!.edition,
        bundle!.source,
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";
  return (
    <Screen title={d?.title ?? "Dua"} back>
      {!d ? (
        <ContentUnavailable />
      ) : (
        <>
          <Card>
            <Copy
              size={30}
              style={{
                fontFamily: "Arabic",
                textAlign: "right",
                writingDirection: "rtl",
                lineHeight: 60,
              }}
            >
              {d.arabic}
            </Copy>
            {d.transliteration ? <Copy>{d.transliteration}</Copy> : null}
            <Copy>{d.translation}</Copy>
            <Copy muted>{d.reference}</Copy>
            <Copy
              muted
            >{`${bundle!.edition} · ${bundle!.license} · ${bundle!.source}`}</Copy>
          </Card>
          <Button
            label={favorite ? "Remove favorite" : "Favorite"}
            busy={mutation.isPending}
            disabled={q.isPending || !!q.error}
            onPress={() => mutation.mutate(undefined)}
          />
          <Button
            secondary
            label="Copy"
            onPress={() => {
              void Clipboard.setStringAsync(text)
                .then(() => toast("Copied"))
                .catch(setError);
            }}
          />
          <Button
            secondary
            label="Share"
            onPress={() => {
              void Share.share({ message: text }).catch(setError);
            }}
          />
        </>
      )}
      {mutation.error || error ? (
        <ErrorRetry error={mutation.error ?? error} />
      ) : null}
    </Screen>
  );
}
export function DuaFavoritesScreen() {
  const { bundle } = useContent();
  const router = useRouter();
  const q = useAccountQuery(["dua-favorites"], async () =>
    dataOf(await api.GET("/v1/dua/favorites")),
  );
  return (
    <Screen title="Favorites" back>
      <QueryState query={q}>
        {q.data?.length ? (
          q.data.map((f) => (
            <Card key={f.duaId}>
              <ActionRow
                label={
                  bundle?.payload.duas.find((d) => d.id === f.duaId)?.title ??
                  f.duaId
                }
                onPress={() =>
                  router.push(`/dua/detail/${encodeURIComponent(f.duaId)}`)
                }
              />
            </Card>
          ))
        ) : (
          <Empty
            message="No favorite duas yet."
            label="Dua"
            action={() => router.push("/dua")}
          />
        )}
      </QueryState>
    </Screen>
  );
}
