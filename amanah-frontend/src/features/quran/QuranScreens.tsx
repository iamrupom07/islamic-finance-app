import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  type GestureResponderEvent,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Search,
  Bookmark,
  BookOpen,
  ChevronRight,
  Download,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Repeat,
  Headphones,
  Check,
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
import { usePlayer } from "../../core/audio/PlayerProvider";
import { quranTrack, quranVerseTrack } from "../../content/contract";
import { useAuth } from "../../core/auth/AuthProvider";
import { downloadAudio, downloaded } from "../../core/audio/downloads";

export function ContentUnavailable() {
  return (
    <Empty message="Verified, redistribution-approved content has not been installed. No generated religious text is substituted." />
  );
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

const RECITER_STORAGE_KEY = "amanah.preferred-reciter.v1";
let memoryReciterId = "1";
const reciterSubscribers = new Set<(id: string) => void>();

export function useQuranReciter() {
  const [reciterId, setReciter] = useState(memoryReciterId);

  useEffect(() => {
    reciterSubscribers.add(setReciter);
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    ) {
      try {
        const saved = window.localStorage.getItem(RECITER_STORAGE_KEY);
        if (saved && (saved === "1" || saved === "10")) {
          memoryReciterId = saved;
          setReciter(saved);
        }
      } catch {
        // ignore
      }
    }
    return () => {
      reciterSubscribers.delete(setReciter);
    };
  }, []);

  const selectReciter = useCallback((id: string) => {
    memoryReciterId = id;
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    ) {
      try {
        window.localStorage.setItem(RECITER_STORAGE_KEY, id);
      } catch {
        // ignore
      }
    }
    reciterSubscribers.forEach((fn) => fn(id));
  }, []);

  return { reciterId, setReciterId: selectReciter };
}

export function QuranScreen() {
  const router = useRouter();
  const { colors, dark: isDark, locale, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const player = usePlayer();
  const { bundle } = useContent();
  const { reciterId, setReciterId } = useQuranReciter();
  const toast = useToast();

  const handlePlaySurah = async (surahNumber: number) => {
    if (!bundle || !player) return;
    if (player.track?.surah === surahNumber && player.track.kind === "QURAN") {
      player.toggle();
      return;
    }
    try {
      const track = quranTrack(bundle, surahNumber, reciterId);
      await player.open(track);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Unable to play audio");
    }
  };

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

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Audio downloads"
              onPress={() => router.push("/quran/downloads")}
              style={({ pressed }) => [
                quranStyles.bookmarkButton,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: isDark ? colors.border : "#F1F5F9",
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Download size={20} color={colors.ink} strokeWidth={2.2} />
            </Pressable>
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
              {progress.data?.updatedAt ? (
                <Text
                  style={[
                    quranStyles.continueTimeText,
                    { color: isDark ? "#A3D4B6" : "#64748B" },
                  ]}
                >
                  Last read: {progress.data.updatedAt.slice(0, 10)}
                </Text>
              ) : null}
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
                Resume reading
              </Text>
              <ChevronRight
                size={16}
                color="#FFFFFF"
                strokeWidth={2.5}
                style={{ marginLeft: 2 }}
              />
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
          <Search
            size={20}
            color="#94A3B8"
            strokeWidth={2}
            style={{ marginRight: 10 }}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search surah name or number"
            placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
            style={[quranStyles.searchInput, { color: colors.ink }]}
          />
        </View>

        {/* Reciter Selector Bar */}
        {bundle?.payload.reciters && bundle.payload.reciters.length > 0 ? (
          <View
            style={[
              quranStyles.reciterBar,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: isDark ? colors.border : "#F1F5F9",
              },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Headphones
                size={16}
                color={isDark ? "#34D399" : "#0F6E56"}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  quranStyles.reciterBarLabel,
                  {
                    color: isDark ? "#94A3B8" : "#64748B",
                    fontFamily: locale === "bn" ? "Bengali" : undefined,
                  },
                ]}
              >
                {t("Reciter")}:
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {bundle.payload.reciters.map((r) => {
                const active = r.id === reciterId;
                return (
                  <Pressable
                    key={r.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Select reciter ${r.name}`}
                    onPress={() => setReciterId(r.id)}
                    style={({ pressed }) => [
                      quranStyles.reciterChip,
                      {
                        backgroundColor: active
                          ? isDark
                            ? "#172E24"
                            : "#EBF5F0"
                          : isDark
                            ? "#1E293B"
                            : "#F8FAFC",
                        borderColor: active
                          ? "#0F6E56"
                          : isDark
                            ? colors.border
                            : "#E2E8F0",
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        quranStyles.reciterChipText,
                        {
                          color: active
                            ? isDark
                              ? "#34D399"
                              : "#0F6E56"
                            : colors.ink,
                          fontWeight: active ? "600" : "400",
                        },
                      ]}
                    >
                      {r.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Surahs List (Image 4) */}
        <View
          style={[
            quranStyles.surahListContainer,
            isWide && {
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            },
          ]}
        >
          {filteredSurahs.map((s) => {
            const isCurrentSurah =
              player?.track?.surah === s.number &&
              player.track.kind === "QURAN";
            const isPlayingThis = isCurrentSurah && player?.playing;
            const isLoadingThis = isCurrentSurah && player?.loading;
            return (
              <View
                key={s.number}
                style={[
                  quranStyles.surahCard,
                  isWide && { width: "48.8%" },
                  {
                    backgroundColor: isDark ? colors.surface : "#FFFFFF",
                    borderColor: isCurrentSurah
                      ? isDark
                        ? "#284A3B"
                        : "#A7F3D0"
                      : isDark
                        ? colors.border
                        : "#F1F5F9",
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Surah ${s.number}: ${s.name}, ${s.numberOfAyahs} ayahs`}
                  onPress={() => router.push(`/quran/${s.number}`)}
                  style={({ pressed }) => [
                    quranStyles.surahCardMain,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  {/* Number Badge */}
                  <View
                    style={[
                      quranStyles.surahNumberCircle,
                      {
                        backgroundColor: isCurrentSurah
                          ? isDark
                            ? "#234839"
                            : "#D1FAE5"
                          : isDark
                            ? "#172E24"
                            : "#EBF5F0",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        quranStyles.surahNumberText,
                        {
                          color: isCurrentSurah
                            ? "#0F6E56"
                            : isDark
                              ? "#A3D4B6"
                              : "#182322",
                        },
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
                          fontFamily:
                            locale === "bn" ? "Bengali" : "OutfitMedium",
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

                  {/* Arabic Name */}
                  <Text
                    style={[quranStyles.surahArabicText, { color: colors.ink }]}
                  >
                    {s.arabicName}
                  </Text>
                </Pressable>

                {/* Audio Button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPlayingThis
                      ? `Pause Surah ${s.name}`
                      : `Play Surah ${s.name}`
                  }
                  onPress={() => handlePlaySurah(s.number)}
                  style={({ pressed }) => [
                    quranStyles.audioPlayButton,
                    isPlayingThis
                      ? {
                          backgroundColor: "#0F6E56",
                          borderColor: "#0F6E56",
                        }
                      : isCurrentSurah
                        ? {
                            backgroundColor: isDark ? "#172E24" : "#EBF5F0",
                            borderColor: "#0F6E56",
                          }
                        : {
                            backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                            borderColor: isDark ? "#334155" : "#E2E8F0",
                          },
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator
                      size="small"
                      color={isDark ? "#34D399" : "#0F6E56"}
                    />
                  ) : isPlayingThis ? (
                    <Pause size={15} color="#FFFFFF" strokeWidth={2.5} />
                  ) : (
                    <Play
                      size={15}
                      color={
                        isCurrentSurah
                          ? isDark
                            ? "#34D399"
                            : "#0F6E56"
                          : isDark
                            ? "#94A3B8"
                            : "#475569"
                      }
                      strokeWidth={2.5}
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </Pressable>

                {/* Chevron */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open Surah ${s.name}`}
                  onPress={() => router.push(`/quran/${s.number}`)}
                  style={({ pressed }) => [
                    { padding: 4, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <ChevronRight
                    size={18}
                    color="#94A3B8"
                    strokeWidth={2}
                    style={{ marginLeft: 2 }}
                  />
                </Pressable>
              </View>
            );
          })}
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
  surahCardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
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
  reciterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  reciterBarLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  reciterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  reciterChipText: {
    fontSize: 12,
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});

export function SurahAudioPlayer({
  surahNumber,
  surahName,
}: {
  surahNumber: number;
  surahName: string;
}) {
  const { bundle } = useContent();
  const player = usePlayer();
  const { user } = useAuth();
  const { dark: isDark, t, locale } = useTheme();
  const { reciterId, setReciterId } = useQuranReciter();
  const toast = useToast();

  const isThisSurah =
    player?.track?.surah === surahNumber && player.track.kind === "QURAN";
  const isPlaying = isThisSurah && !!player?.playing;
  const isLoading = isThisSurah && !!player?.loading;

  const [barWidth, setBarWidth] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const reciters = bundle?.payload.reciters ?? [];
  const currentReciter =
    reciters.find((r) => r.id === reciterId) ?? reciters[0];

  useEffect(() => {
    if (!user || Platform.OS === "web") return;
    let cancelled = false;
    void downloaded(user.id).then((list) => {
      if (cancelled) return;
      const found = list.some(
        (d) =>
          d.track.surah === surahNumber &&
          d.track.kind === "QURAN" &&
          d.track.artist === currentReciter?.name,
      );
      setIsDownloaded(found);
    });
    return () => {
      cancelled = true;
    };
  }, [user, surahNumber, currentReciter?.name]);

  const handleTogglePlay = async () => {
    if (!bundle || !player) return;
    try {
      if (isThisSurah) {
        player.toggle();
      } else {
        const track = quranTrack(bundle, surahNumber, reciterId);
        await player.open(track);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Unable to play audio");
    }
  };

  const handleSeek = async (seconds: number) => {
    if (!player || !isThisSurah) return;
    await player.seek(seconds);
  };

  const handleBarPress = (e: GestureResponderEvent) => {
    if (!isThisSurah || !player?.duration || barWidth <= 0) return;
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / barWidth));
    void player.seek(ratio * player.duration);
  };

  const handleDownload = async () => {
    if (!user || !bundle) {
      toast("Please sign in to download audio.");
      return;
    }
    if (Platform.OS === "web") {
      toast("Audio download is available in mobile apps.");
      return;
    }
    try {
      setDownloadBusy(true);
      const track = quranTrack(bundle, surahNumber, reciterId);
      await downloadAudio(user.id, track, true);
      setIsDownloaded(true);
      toast("Surah audio downloaded for offline listening");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloadBusy(false);
    }
  };

  const progressPercent =
    isThisSurah && player?.duration && player.duration > 0
      ? Math.min(100, Math.max(0, (player.time / player.duration) * 100))
      : 0;

  return (
    <View
      style={[
        readerAudioStyles.card,
        {
          backgroundColor: isDark ? "#13271F" : "#F0FDF4",
          borderColor: isDark ? "#234839" : "#BBF7D0",
        },
      ]}
    >
      {/* Header: Reciter Selector & Repeat */}
      <View style={readerAudioStyles.headerRow}>
        <View style={readerAudioStyles.reciterSelector}>
          <Headphones
            size={16}
            color={isDark ? "#34D399" : "#0F6E56"}
            strokeWidth={2.2}
          />
          <Text
            style={[
              readerAudioStyles.reciterLabel,
              {
                color: isDark ? "#94A3B8" : "#475569",
                fontFamily: locale === "bn" ? "Bengali" : undefined,
              },
            ]}
          >
            {t("Reciter")}:
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {reciters.map((r) => {
              const active = r.id === reciterId;
              return (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${r.name}`}
                  onPress={async () => {
                    setReciterId(r.id);
                    if (isThisSurah && bundle && player) {
                      const track = quranTrack(bundle, surahNumber, r.id);
                      await player.open(track);
                    }
                  }}
                  style={({ pressed }) => [
                    readerAudioStyles.reciterPill,
                    {
                      backgroundColor: active
                        ? "#0F6E56"
                        : isDark
                          ? "#1E293B"
                          : "#FFFFFF",
                      borderColor: active
                        ? "#0F6E56"
                        : isDark
                          ? "#334155"
                          : "#CBD5E1",
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      readerAudioStyles.reciterPillText,
                      {
                        color: active
                          ? "#FFFFFF"
                          : isDark
                            ? "#CBD5E1"
                            : "#334155",
                        fontWeight: active ? "600" : "400",
                      },
                    ]}
                  >
                    {r.name.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Repeat & Download Controls */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {Platform.OS !== "web" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isDownloaded ? "Audio downloaded" : "Download audio"
              }
              disabled={downloadBusy || isDownloaded}
              onPress={handleDownload}
              style={({ pressed }) => [
                readerAudioStyles.iconButton,
                {
                  backgroundColor: isDownloaded
                    ? isDark
                      ? "#173E2E"
                      : "#DCFCE7"
                    : isDark
                      ? "#1E293B"
                      : "#FFFFFF",
                  borderColor: isDownloaded
                    ? "#0F6E56"
                    : isDark
                      ? "#334155"
                      : "#CBD5E1",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {downloadBusy ? (
                <ActivityIndicator size="small" color="#0F6E56" />
              ) : isDownloaded ? (
                <Check size={16} color="#0F6E56" strokeWidth={2.5} />
              ) : (
                <Download
                  size={16}
                  color={isDark ? "#CBD5E1" : "#475569"}
                  strokeWidth={2}
                />
              )}
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              player?.repeat ? t("Repeat on") : t("Repeat off")
            }
            onPress={() => player?.setRepeat(!player.repeat)}
            style={({ pressed }) => [
              readerAudioStyles.iconButton,
              {
                backgroundColor: player?.repeat
                  ? isDark
                    ? "#173E2E"
                    : "#DCFCE7"
                  : isDark
                    ? "#1E293B"
                    : "#FFFFFF",
                borderColor: player?.repeat
                  ? "#0F6E56"
                  : isDark
                    ? "#334155"
                    : "#CBD5E1",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Repeat
              size={16}
              color={
                player?.repeat ? "#0F6E56" : isDark ? "#CBD5E1" : "#475569"
              }
              strokeWidth={2.2}
            />
          </Pressable>
        </View>
      </View>

      {/* Main Transport Controls */}
      <View style={readerAudioStyles.controlsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back 15 seconds"
          disabled={!isThisSurah}
          onPress={() => {
            if (player) void handleSeek(player.time - 15);
          }}
          style={({ pressed }) => [
            readerAudioStyles.secondaryButton,
            {
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderColor: isDark ? "#334155" : "#E2E8F0",
              opacity: pressed ? 0.7 : !isThisSurah ? 0.4 : 1,
            },
          ]}
        >
          <RotateCcw
            size={18}
            color={isDark ? "#CBD5E1" : "#334155"}
            strokeWidth={2}
          />
          <Text
            style={[
              readerAudioStyles.seekText,
              { color: isDark ? "#94A3B8" : "#64748B" },
            ]}
          >
            15s
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isPlaying ? `Pause ${surahName}` : `Play ${surahName}`
          }
          disabled={isLoading}
          onPress={handleTogglePlay}
          style={({ pressed }) => [
            readerAudioStyles.mainPlayButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isPlaying ? (
            <Pause size={22} color="#FFFFFF" strokeWidth={2.5} />
          ) : (
            <Play
              size={22}
              color="#FFFFFF"
              strokeWidth={2.5}
              style={{ marginLeft: 3 }}
            />
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forward 15 seconds"
          disabled={!isThisSurah}
          onPress={() => {
            if (player) void handleSeek(player.time + 15);
          }}
          style={({ pressed }) => [
            readerAudioStyles.secondaryButton,
            {
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderColor: isDark ? "#334155" : "#E2E8F0",
              opacity: pressed ? 0.7 : !isThisSurah ? 0.4 : 1,
            },
          ]}
        >
          <RotateCw
            size={18}
            color={isDark ? "#CBD5E1" : "#334155"}
            strokeWidth={2}
          />
          <Text
            style={[
              readerAudioStyles.seekText,
              { color: isDark ? "#94A3B8" : "#64748B" },
            ]}
          >
            15s
          </Text>
        </Pressable>
      </View>

      {/* Progress Bar & Time */}
      <View style={readerAudioStyles.progressSection}>
        <Text
          style={[
            readerAudioStyles.timeText,
            { color: isDark ? "#94A3B8" : "#64748B" },
          ]}
        >
          {formatAudioTime(isThisSurah && player ? player.time : 0)}
        </Text>

        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Audio progress scrubber"
          onPress={handleBarPress}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          style={[
            readerAudioStyles.progressBarTrack,
            { backgroundColor: isDark ? "#284A3B" : "#E2E8F0" },
          ]}
        >
          <View
            style={[
              readerAudioStyles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isDark ? "#34D399" : "#0F6E56",
              },
            ]}
          />
        </Pressable>

        <Text
          style={[
            readerAudioStyles.timeText,
            { color: isDark ? "#94A3B8" : "#64748B" },
          ]}
        >
          {formatAudioTime(isThisSurah && player ? player.duration : 0)}
        </Text>
      </View>

      {/* Error Retry if active surah has audio error */}
      {isThisSurah && player?.error ? (
        <View style={{ marginTop: 8 }}>
          <ErrorRetry
            error={player.error}
            retry={() => {
              if (bundle) {
                void player.open(quranTrack(bundle, surahNumber, reciterId));
              }
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const readerAudioStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    gap: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reciterSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  reciterLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  reciterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  reciterPillText: {
    fontSize: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginVertical: 4,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  seekText: {
    fontSize: 12,
    fontWeight: "600",
  },
  mainPlayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0F6E56",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F6E56",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeText: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    width: 36,
    textAlign: "center",
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
});
export function QuranReaderScreen() {
  const { surah, ayah } = useLocalSearchParams<{
    surah: string;
    ayah?: string;
  }>();
  const router = useRouter();
  const { bundle } = useContent();
  const player = usePlayer();
  const { reciterId } = useQuranReciter();
  const { dark: isDark, t } = useTheme();
  const toast = useToast();
  const s = bundle?.payload.surahs.find((s) => s.number === Number(surah));
  const [size, setSize] = useState(28);
  const [translation, setTranslation] = useState(true);
  const [page, setPage] = useState(
    Math.max(0, Math.floor(((Number(ayah) || 1) - 1) / 20)),
  );
  const [jumpAyah, setJumpAyah] = useState("");
  const [jumpError, setJumpError] = useState<string | null>(null);

  const handleJump = () => {
    const n = parseInt(jumpAyah.trim(), 10);
    if (!s || isNaN(n) || n < 1 || n > s.verses.length) {
      setJumpError("Choose a verse within this surah.");
      return;
    }
    setJumpError(null);
    setPage(Math.floor((n - 1) / 20));
  };

  const handlePlayVerse = async (ayahNumber: number) => {
    if (!player || !bundle || !s) return;
    const isThisVerse =
      player.track?.kind === "QURAN" &&
      player.track?.surah === s.number &&
      player.track?.ayah === ayahNumber;

    if (isThisVerse) {
      player.toggle();
    } else {
      const track = quranVerseTrack(bundle, s.number, ayahNumber, reciterId);
      await player.open(track);
    }
  };

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
        edition: bundle?.edition,
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
          <SurahAudioPlayer surahNumber={s.number} surahName={s.name} />
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
            <Button
              secondary
              label={
                player?.playing &&
                player.track?.surah === s.number &&
                player.track.kind === "QURAN"
                  ? "Pause"
                  : "Play full surah"
              }
              onPress={async () => {
                if (!player || !bundle) return;
                if (
                  player.track?.surah === s.number &&
                  player.track.kind === "QURAN"
                ) {
                  player.toggle();
                } else {
                  const track = quranTrack(bundle, s.number, reciterId);
                  await player.open(track);
                }
              }}
            />
          </Row>
          <Row style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
            <TextInput
              accessibilityLabel="Jump to ayah"
              placeholder="Jump to ayah"
              value={jumpAyah}
              onChangeText={(t) => {
                setJumpAyah(t);
                if (jumpError) setJumpError(null);
              }}
              keyboardType="numeric"
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#CBD5E1",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 15,
                backgroundColor: "#FFFFFF",
              }}
            />
            <Button secondary label="Go to ayah" onPress={handleJump} />
          </Row>
          {jumpError ? (
            <Copy style={{ color: "#EF4444", marginTop: 4 }}>{jumpError}</Copy>
          ) : null}
          {bookmark.error ? <ErrorRetry error={bookmark.error} /> : null}
          {save.error ? (
            <ErrorRetry
              error={save.error}
              retry={() => {
                void progress.refetch();
              }}
            />
          ) : null}
          {s.verses.slice(page * 20, page * 20 + 20).map((v) => {
            const isVerseActive =
              player?.track?.kind === "QURAN" &&
              player.track?.surah === s.number &&
              player.track?.ayah === v.number;
            const isVersePlaying = isVerseActive && Boolean(player?.playing);
            const isVerseLoading = isVerseActive && Boolean(player?.loading);

            return (
              <Card
                key={v.number}
                style={
                  isVerseActive
                    ? {
                        borderColor: isDark ? "#059669" : "#10B981",
                        borderWidth: 1.5,
                        backgroundColor: isDark ? "#06281E" : "#F0FDF4",
                      }
                    : undefined
                }
              >
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 6,
                    marginBottom: 4,
                  }}
                >
                  <Copy muted>{`${s.number}:${v.number}`}</Copy>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isVersePlaying ? t("Pause") : t("Play")}
                    onPress={() => void handlePlayVerse(v.number)}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 14,
                        borderWidth: 1,
                        backgroundColor: isVersePlaying
                          ? "#0F6E56"
                          : isDark
                            ? "#1E293B"
                            : "#F1F5F9",
                        borderColor: isVersePlaying
                          ? "#0F6E56"
                          : isDark
                            ? "#334155"
                            : "#CBD5E1",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    {isVerseLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={isVersePlaying ? "#FFFFFF" : "#0F6E56"}
                      />
                    ) : isVersePlaying ? (
                      <>
                        <Pause size={13} color="#FFFFFF" strokeWidth={2.5} />
                        <Copy
                          size={12}
                          style={{ color: "#FFFFFF", fontWeight: "600" }}
                        >
                          Pause
                        </Copy>
                      </>
                    ) : (
                      <>
                        <Play
                          size={13}
                          color={isDark ? "#34D399" : "#0F6E56"}
                          strokeWidth={2.5}
                          style={{ marginLeft: 1 }}
                        />
                        <Copy
                          size={12}
                          style={{
                            color: isDark ? "#34D399" : "#0F6E56",
                            fontWeight: "600",
                          }}
                        >
                          Play
                        </Copy>
                      </>
                    )}
                  </Pressable>
                </View>
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
                  label="Mark read here"
                  busy={save.isPending}
                  disabled={progress.isPending || !!progress.error}
                  onPress={() => save.mutate(v.number)}
                />
              </Card>
            );
          })}
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
