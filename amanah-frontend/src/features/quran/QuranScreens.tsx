import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Search,
  Bookmark,
  BookOpen,
  ChevronRight,
} from "lucide-react-native";
import {
  Screen,
  Card,
  Copy,
  Button,
  ActionRow,
  QueryState,
  Empty,
  ErrorRetry,
  Row,
  useToast,
} from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
import { api, dataOf } from "../../core/api/client";
import { useAccountQuery, useAccountMutation } from "../../core/api/hooks";
import { useContent } from "../../content/ContentProvider";
import { SURAHS_CATALOG } from "./surahsData";

export function ContentUnavailable() {
  return (
    <Empty message="Verified, redistribution-approved content has not been installed. No generated religious text is substituted." />
  );
}

export function QuranScreen() {
  const router = useRouter();
  const { colors, dark: isDark, locale } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const progress = useAccountQuery(["quran-progress"], async () => {
    try {
      return dataOf(await api.GET("/v1/quran/progress"));
    } catch {
      return null;
    }
  });

  const lastReadSurahNum = progress.data?.surah ?? 1;
  const lastReadAyahNum = progress.data?.ayah ?? 1;
  const lastReadSurah =
    SURAHS_CATALOG.find((s) => s.number === lastReadSurahNum) ??
    SURAHS_CATALOG[0]!;

  const filteredSurahs = SURAHS_CATALOG.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      String(s.number).includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.transliteration.toLowerCase().includes(q) ||
      s.arabicName.includes(q)
    );
  });

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        quranStyles.container,
        { backgroundColor: isDark ? colors.canvas : "#F8FAFC" },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          quranStyles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: Title and Bookmarks Button (Image 4) */}
        <View style={quranStyles.topRow}>
          <Text
            style={[
              quranStyles.headerTitle,
              {
                color: colors.ink,
                fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
              },
            ]}
          >
            Quran
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bookmarks"
            onPress={() => router.push("/quran/bookmarks")}
            style={({ pressed }) => [
              quranStyles.bookmarkButton,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: isDark ? colors.border : "#F1F5F9",
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Bookmark size={20} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Subtitle */}
        <Text
          style={[
            quranStyles.headerSubtitle,
            { color: isDark ? "#94A3B8" : "#64748B" },
          ]}
        >
          A moment to read and reflect.
        </Text>

        {/* Continue reading Card (Image 4) */}
        <View
          style={[
            quranStyles.continueCard,
            {
              backgroundColor: isDark ? "#172E24" : "#EBF5F0",
              borderColor: isDark ? "#284A3B" : "#D8EDE1",
            },
          ]}
        >
          <Text
            style={[
              quranStyles.continueLabel,
              { color: isDark ? "#A3D4B6" : "#4B6358" },
            ]}
          >
            Continue reading
          </Text>

          <View style={quranStyles.continueRow}>
            <View
              style={[
                quranStyles.continueIconCircle,
                { backgroundColor: isDark ? "#284A3B" : "#DCF0E5" },
              ]}
            >
              <BookOpen size={22} color="#0F6E56" strokeWidth={2.2} />
            </View>

            <View style={quranStyles.continueInfoCol}>
              <Text
                style={[
                  quranStyles.continueSurahText,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                {lastReadSurah.name} · Ayah {lastReadAyahNum}
              </Text>
              <Text
                style={[
                  quranStyles.continueTimeText,
                  { color: isDark ? "#A3D4B6" : "#64748B" },
                ]}
              >
                Last read: 26 Oct 2026, 08:15 AM
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resume reading"
              onPress={() =>
                router.push({
                  pathname: "/quran/[surah]",
                  params: {
                    surah: String(lastReadSurah.number),
                    ayah: String(lastReadAyahNum),
                  },
                })
              }
              style={({ pressed }) => [
                quranStyles.resumeButton,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text
                style={[
                  quranStyles.resumeButtonText,
                  { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
                ]}
              >
                Resume
              </Text>
              <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 2 }} />
            </Pressable>
          </View>
        </View>

        {/* Search Input (Image 4) */}
        <View
          style={[
            quranStyles.searchBar,
            {
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderColor: isDark ? colors.border : "#E2E8F0",
            },
          ]}
        >
          <Search size={20} color="#94A3B8" strokeWidth={2} style={{ marginRight: 10 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search surah name or number"
            placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
            style={[
              quranStyles.searchInput,
              { color: colors.ink },
            ]}
          />
        </View>

        {/* Surahs List (Image 4) */}
        <View
          style={[
            quranStyles.surahListContainer,
            isWide && { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
          ]}
        >
          {filteredSurahs.map((s) => (
            <Pressable
              key={s.number}
              accessibilityRole="button"
              accessibilityLabel={`Surah ${s.number}: ${s.name}, ${s.numberOfAyahs} ayahs`}
              onPress={() => router.push(`/quran/${s.number}`)}
              style={({ pressed }) => [
                quranStyles.surahCard,
                isWide && { width: "48.8%" },
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: isDark ? colors.border : "#F1F5F9",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {/* Number Badge */}
              <View
                style={[
                  quranStyles.surahNumberCircle,
                  { backgroundColor: isDark ? "#172E24" : "#EBF5F0" },
                ]}
              >
                <Text
                  style={[
                    quranStyles.surahNumberText,
                    { color: isDark ? "#A3D4B6" : "#182322" },
                  ]}
                >
                  {s.number}
                </Text>
              </View>

              {/* Title & Ayah Count */}
              <View style={quranStyles.surahTitleCol}>
                <Text
                  style={[
                    quranStyles.surahNameText,
                    {
                      color: colors.ink,
                      fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                    },
                  ]}
                >
                  {s.name}
                </Text>
                <Text
                  style={[
                    quranStyles.surahAyahsText,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  {s.numberOfAyahs} ayahs
                </Text>
              </View>

              {/* Arabic Name & Chevron */}
              <View style={quranStyles.surahArabicCol}>
                <Text
                  style={[
                    quranStyles.surahArabicText,
                    { color: colors.ink },
                  ]}
                >
                  {s.arabicName}
                </Text>
                <ChevronRight size={18} color="#94A3B8" strokeWidth={2} style={{ marginLeft: 10 }} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const quranStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  bookmarkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 18,
  },
  continueCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  continueLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  continueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  continueIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  continueInfoCol: {
    flex: 1,
  },
  continueSurahText: {
    fontSize: 16,
    fontWeight: "700",
  },
  continueTimeText: {
    fontSize: 12,
    marginTop: 3,
  },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#065F46",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  resumeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  surahListContainer: {
    gap: 8,
  },
  surahCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  surahNumberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  surahNumberText: {
    fontSize: 15,
    fontWeight: "700",
  },
  surahTitleCol: {
    flex: 1,
  },
  surahNameText: {
    fontSize: 16,
    fontWeight: "600",
  },
  surahAyahsText: {
    fontSize: 13,
    marginTop: 2,
  },
  surahArabicCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  surahArabicText: {
    fontSize: 22,
    fontFamily: "Arabic",
  },
});
export function QuranReaderScreen() {
  const { surah, ayah } = useLocalSearchParams<{
    surah: string;
    ayah?: string;
  }>();
  const router = useRouter();
  const { bundle } = useContent();
  const toast = useToast();
  const s = bundle?.payload.surahs.find((s) => s.number === Number(surah));
  const [size, setSize] = useState(28);
  const [translation, setTranslation] = useState(true);
  const [page, setPage] = useState(
    Math.max(0, Math.floor(((Number(ayah) || 1) - 1) / 20)),
  );
  const bookmarks = useAccountQuery(["quran-bookmarks"], async () =>
    dataOf(await api.GET("/v1/quran/bookmarks")),
  );
  const progress = useAccountQuery(["quran-progress"], async () =>
    dataOf(await api.GET("/v1/quran/progress")),
  );
  const bookmark = useAccountMutation(async (n) => {
    const ref = { surah: Number(surah), ayah: n as number };
    if (
      bookmarks.data?.some((b) => b.surah === ref.surah && b.ayah === ref.ayah)
    )
      await api.DELETE("/v1/quran/bookmarks/{surah}/{ayah}", {
        params: { path: ref },
      });
    else
      await api.PUT("/v1/quran/bookmarks/{surah}/{ayah}", {
        params: { path: ref },
      });
  });
  const save = useAccountMutation(async (n: number) => {
    await api.PUT("/v1/quran/progress", {
      body: {
        surah: Number(surah),
        ayah: n,
        version: progress.data?.version ?? 1,
      },
    });
    toast("Saved");
  });
  return (
    <Screen title={s?.name ?? "Quran"} back>
      {!s ? (
        <ContentUnavailable />
      ) : (
        <>
          <Row style={{ flexWrap: "wrap" }}>
            <Button
              secondary
              label="Smaller text"
              disabled={size <= 22}
              onPress={() => setSize((n) => n - 2)}
            />
            <Button
              secondary
              label="Larger text"
              disabled={size >= 44}
              onPress={() => setSize((n) => n + 2)}
            />
            <Button
              secondary
              label={translation ? "Hide translation" : "Show translation"}
              onPress={() => setTranslation((v) => !v)}
            />
          </Row>
          {bookmark.error ? <ErrorRetry error={bookmark.error} /> : null}
          {save.error ? (
            <ErrorRetry
              error={save.error}
              retry={() => {
                void progress.refetch();
              }}
            />
          ) : null}
          {s.verses.slice(page * 20, page * 20 + 20).map((v) => (
            <Card key={v.number}>
              <Copy
                size={size}
                style={{
                  fontFamily: "Arabic",
                  textAlign: "right",
                  writingDirection: "rtl",
                  lineHeight: size * 2.1,
                }}
              >
                {v.arabic}
              </Copy>
              <Copy muted>{`${s.number}:${v.number}`}</Copy>
              {translation ? (
                <Copy>
                  {v.translation ?? "Translation not available offline."}
                </Copy>
              ) : null}
              <Button
                secondary
                label={
                  bookmarks.data?.some(
                    (b) => b.surah === s.number && b.ayah === v.number,
                  )
                    ? "Remove bookmark"
                    : "Bookmark"
                }
                busy={bookmark.isPending}
                disabled={bookmarks.isPending || !!bookmarks.error}
                onPress={() => bookmark.mutate(v.number)}
              />
              <Button
                secondary
                label="Resume from this verse"
                busy={save.isPending}
                disabled={progress.isPending || !!progress.error}
                onPress={() => save.mutate(v.number)}
              />
            </Card>
          ))}
          <Row style={{ flexWrap: "wrap" }}>
            <Button
              secondary
              label="Previous page"
              disabled={page === 0}
              onPress={() => setPage((p) => p - 1)}
            />
            <Button
              secondary
              label="Next page"
              disabled={(page + 1) * 20 >= s.verses.length}
              onPress={() => setPage((p) => p + 1)}
            />
          </Row>
          <Row style={{ flexWrap: "wrap" }}>
            <Button
              secondary
              label="Previous surah"
              disabled={s.number === 1}
              onPress={() => router.replace(`/quran/${s.number - 1}`)}
            />
            <Button
              secondary
              label="Next surah"
              disabled={s.number === 114}
              onPress={() => router.replace(`/quran/${s.number + 1}`)}
            />
          </Row>
          <Copy muted>{bundle?.source}</Copy>
        </>
      )}
    </Screen>
  );
}
export function QuranBookmarksScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const q = useAccountQuery(["quran-bookmarks"], async () =>
    dataOf(await api.GET("/v1/quran/bookmarks")),
  );
  const remove = useAccountMutation(
    async (ref: { surah: number; ayah: number }) => {
      await api.DELETE("/v1/quran/bookmarks/{surah}/{ayah}", {
        params: { path: ref },
      });
    },
  );
  return (
    <Screen title="Bookmarks" back>
      <QueryState query={q}>
        {q.data?.length ? (
          q.data.map((b) => (
            <Card key={`${b.surah}:${b.ayah}`}>
              <ActionRow
                label={`${b.surah}:${b.ayah}`}
                detail={
                  bundle?.payload.surahs.find((s) => s.number === b.surah)?.name
                }
                onPress={() =>
                  router.push({
                    pathname: "/quran/[surah]",
                    params: { surah: String(b.surah), ayah: String(b.ayah) },
                  })
                }
              />
              <Button
                secondary
                label="Remove bookmark"
                busy={remove.isPending}
                onPress={() => remove.mutate({ surah: b.surah, ayah: b.ayah })}
              />
            </Card>
          ))
        ) : (
          <Empty
            message="Save a verse to return to it."
            label="Quran"
            action={() => router.push("/quran")}
          />
        )}
      </QueryState>
      {remove.error ? <ErrorRetry error={remove.error} /> : null}
    </Screen>
  );
}
