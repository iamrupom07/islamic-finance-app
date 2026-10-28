import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Share,
  useWindowDimensions,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Search,
  X,
  Heart,
  ChevronRight,
  Sun,
  Moon,
  Compass,
  Utensils,
  HeartPulse,
  CloudRain,
  ShieldAlert,
  Coins,
  Droplets,
  Shirt,
  Sparkles,
  Navigation,
} from "lucide-react-native";
import {
  Screen,
  Card,
  Copy,
  ActionRow,
  Button,
  QueryState,
  Empty,
  ErrorRetry,
  useToast,
} from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
import { api, dataOf } from "../../core/api/client";
import { useAccountQuery, useAccountMutation } from "../../core/api/hooks";
import { useContent } from "../../content/ContentProvider";
import { ContentUnavailable } from "../quran/QuranScreens";

type CategoryMeta = {
  icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth?: number;
  }>;
  color: string;
  bgLight: string;
  bgDark: string;
};

function getCategoryMeta(category: string): CategoryMeta {
  const c = category.toLowerCase();
  if (c.includes("morning") || c.includes("wake") || c.includes("sun")) {
    return {
      icon: Sun,
      color: "#D97706",
      bgLight: "#FEF3C7",
      bgDark: "#38240D",
    };
  }
  if (
    c.includes("evening") ||
    c.includes("sleep") ||
    c.includes("night") ||
    c.includes("moon")
  ) {
    return {
      icon: Moon,
      color: "#6366F1",
      bgLight: "#EEF2FF",
      bgDark: "#1E1B4B",
    };
  }
  if (
    c.includes("prayer") ||
    c.includes("mosque") ||
    c.includes("athan") ||
    c.includes("sujood") ||
    c.includes("ruki") ||
    c.includes("tashahhud") ||
    c.includes("tash-ahhud") ||
    c.includes("witr") ||
    c.includes("qunut") ||
    c.includes("istikharah")
  ) {
    return {
      icon: Compass,
      color: "#0F6E56",
      bgLight: "#E1F5EE",
      bgDark: "#0A382C",
    };
  }
  if (c.includes("dress") || c.includes("clothes")) {
    return {
      icon: Shirt,
      color: "#0284C7",
      bgLight: "#E0F2FE",
      bgDark: "#0C364D",
    };
  }
  if (c.includes("restroom") || c.includes("ablution")) {
    return {
      icon: Droplets,
      color: "#06B6D4",
      bgLight: "#ECFEFF",
      bgDark: "#083344",
    };
  }
  if (
    c.includes("food") ||
    c.includes("eat") ||
    c.includes("fasting") ||
    c.includes("fast") ||
    c.includes("drink") ||
    c.includes("dates") ||
    c.includes("guest")
  ) {
    return {
      icon: Utensils,
      color: "#EA580C",
      bgLight: "#FFEDD5",
      bgDark: "#3D1A07",
    };
  }
  if (
    c.includes("travel") ||
    c.includes("vehicle") ||
    c.includes("riding") ||
    c.includes("town") ||
    c.includes("city") ||
    c.includes("market")
  ) {
    return {
      icon: Navigation,
      color: "#2563EB",
      bgLight: "#DBEAFE",
      bgDark: "#172554",
    };
  }
  if (
    c.includes("sick") ||
    c.includes("ill") ||
    c.includes("dead") ||
    c.includes("grave") ||
    c.includes("funeral") ||
    c.includes("bereaved")
  ) {
    return {
      icon: HeartPulse,
      color: "#E11D48",
      bgLight: "#FFE4E6",
      bgDark: "#4C0519",
    };
  }
  if (c.includes("rain") || c.includes("wind") || c.includes("thunder")) {
    return {
      icon: CloudRain,
      color: "#0891B2",
      bgLight: "#CFFAFE",
      bgDark: "#164E63",
    };
  }
  if (
    c.includes("enemy") ||
    c.includes("devil") ||
    c.includes("satan") ||
    c.includes("fear") ||
    c.includes("harm") ||
    c.includes("protection") ||
    c.includes("adversary") ||
    c.includes("evil") ||
    c.includes("worry") ||
    c.includes("grief") ||
    c.includes("anguish")
  ) {
    return {
      icon: ShieldAlert,
      color: "#DC2626",
      bgLight: "#FEE2E2",
      bgDark: "#450A0A",
    };
  }
  if (
    c.includes("debt") ||
    c.includes("money") ||
    c.includes("wealth") ||
    c.includes("loan")
  ) {
    return {
      icon: Coins,
      color: "#D97706",
      bgLight: "#FEF3C7",
      bgDark: "#38240D",
    };
  }
  return {
    icon: Sparkles,
    color: "#0F6E56",
    bgLight: "#E1F5EE",
    bgDark: "#0A382C",
  };
}

const FILTER_TABS = [
  "All",
  "Daily Life",
  "Prayer",
  "Morning & Evening",
  "Protection",
  "Travel",
  "Food & Fasting",
] as const;

type FilterTab = (typeof FILTER_TABS)[number];

function matchesTab(category: string, tab: FilterTab): boolean {
  if (tab === "All") return true;
  const c = category.toLowerCase();
  if (tab === "Daily Life") {
    return (
      c.includes("wake") ||
      c.includes("dress") ||
      c.includes("clothes") ||
      c.includes("restroom") ||
      c.includes("ablution") ||
      c.includes("home") ||
      c.includes("sleep") ||
      c.includes("sneez") ||
      c.includes("anger")
    );
  }
  if (tab === "Prayer") {
    return (
      c.includes("mosque") ||
      c.includes("athan") ||
      c.includes("prayer") ||
      c.includes("ruki") ||
      c.includes("sujood") ||
      c.includes("tashahhud") ||
      c.includes("tash-ahhud") ||
      c.includes("istikharah") ||
      c.includes("qunut") ||
      c.includes("witr")
    );
  }
  if (tab === "Morning & Evening") {
    return (
      c.includes("morning") ||
      c.includes("evening") ||
      c.includes("remembrance")
    );
  }
  if (tab === "Protection") {
    return (
      c.includes("worry") ||
      c.includes("grief") ||
      c.includes("anguish") ||
      c.includes("enemy") ||
      c.includes("fear") ||
      c.includes("harm") ||
      c.includes("doubt") ||
      c.includes("debt") ||
      c.includes("satan") ||
      c.includes("devil") ||
      c.includes("sin") ||
      c.includes("sick") ||
      c.includes("ill") ||
      c.includes("protection")
    );
  }
  if (tab === "Travel") {
    return (
      c.includes("riding") ||
      c.includes("vehicle") ||
      c.includes("travel") ||
      c.includes("town") ||
      c.includes("city") ||
      c.includes("market")
    );
  }
  if (tab === "Food & Fasting") {
    return (
      c.includes("eating") ||
      c.includes("fasting") ||
      c.includes("fast") ||
      c.includes("drink") ||
      c.includes("dates") ||
      c.includes("guest")
    );
  }
  return true;
}

export function DuaScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const { colors, dark: isDark, locale } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  const favoritesQuery = useAccountQuery(["dua-favorites"], async () =>
    dataOf(await api.GET("/v1/dua/favorites")),
  );
  const favoritesCount = favoritesQuery.data?.length ?? 0;

  const categories = useMemo(() => {
    return [...new Set(bundle?.payload.duas.map((d) => d.category) ?? [])];
  }, [bundle]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!bundle) return counts;
    for (const d of bundle.payload.duas) {
      counts[d.category] = (counts[d.category] ?? 0) + 1;
    }
    return counts;
  }, [bundle]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => matchesTab(c, activeTab));
  }, [categories, activeTab]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !bundle) return [];
    return bundle.payload.duas.filter((d) => {
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchTrans = d.translation.toLowerCase().includes(q);
      const matchArabic = d.arabic.toLowerCase().includes(q);
      const matchCat = d.category.toLowerCase().includes(q);
      return matchTitle || matchTrans || matchArabic || matchCat;
    });
  }, [search, bundle]);

  return (
    <Screen title="Dua" tabs maxWidth={isWide ? 840 : 680}>
      {/* Hero Header Row with Title and Favorites Button */}
      <View style={styles.heroRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={[
              styles.heroTitle,
              {
                color: colors.ink,
                fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
              },
            ]}
          >
            Hisn al-Muslim
          </Text>
          <Text
            style={[
              styles.heroSubtitle,
              {
                color: isDark ? "#94A3B8" : "#64748B",
                fontFamily: locale === "bn" ? "Bengali" : "Outfit",
              },
            ]}
          >
            Authentic supplications and daily remembrance
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Favorites"
          onPress={() => router.push("/dua/favorites")}
          style={({ pressed }) => [
            styles.favoritesButton,
            {
              backgroundColor: isDark ? "#2A1820" : "#FFF1F2",
              borderColor: isDark ? "#881337" : "#FECDD3",
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Heart size={16} color="#E11D48" fill="#E11D48" />
          <Text
            style={[
              styles.favoritesButtonText,
              { fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium" },
            ]}
          >
            Favorites
          </Text>
          {favoritesCount > 0 ? (
            <View style={styles.favoritesBadge}>
              <Text style={styles.favoritesBadgeText}>{favoritesCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {!bundle ? (
        <ContentUnavailable />
      ) : (
        <>
          {/* Search Box */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: isDark ? colors.border : "#E2E8F0",
              },
            ]}
          >
            <Search
              size={18}
              color={isDark ? "#64748B" : "#94A3B8"}
              strokeWidth={2}
              style={{ marginRight: 10 }}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search duas or categories..."
              placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
              style={[styles.searchInput, { color: colors.ink }]}
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearch("")}
                style={{ padding: 4 }}
              >
                <X
                  size={16}
                  color={isDark ? "#94A3B8" : "#64748B"}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null}
          </View>

          {/* Quick Category Filter Tabs */}
          {!search.trim() ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterTabsContainer}
              style={styles.filterTabsScroll}
            >
              {FILTER_TABS.map((tab) => {
                const active = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    accessibilityRole="button"
                    accessibilityLabel={tab}
                    onPress={() => setActiveTab(tab)}
                    style={({ pressed }) => [
                      styles.filterPill,
                      {
                        backgroundColor: active
                          ? "#0F6E56"
                          : isDark
                            ? colors.surface
                            : "#FFFFFF",
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
                        styles.filterPillText,
                        {
                          color: active
                            ? "#FFFFFF"
                            : isDark
                              ? "#CBD5E1"
                              : "#475569",
                          fontWeight: active ? "700" : "500",
                          fontFamily: locale === "bn" ? "Bengali" : undefined,
                        },
                      ]}
                    >
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Search Result Listing OR Categories Grid */}
          {search.trim() ? (
            searchResults.length > 0 ? (
              <View
                style={[styles.searchGrid, isWide && styles.searchGridWide]}
              >
                {searchResults.map((d) => (
                  <Pressable
                    key={d.id}
                    accessibilityRole="button"
                    accessibilityLabel={d.title}
                    onPress={() =>
                      router.push(`/dua/detail/${encodeURIComponent(d.id)}`)
                    }
                    style={({ pressed }) => [
                      styles.searchCard,
                      isWide && styles.searchCardWide,
                      {
                        backgroundColor: isDark ? colors.surface : "#FFFFFF",
                        borderColor: isDark ? colors.border : "#E2E8F0",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={styles.searchCardHeader}>
                      <View
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isDark ? "#172E24" : "#E1F5EE",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: isDark ? "#34D399" : "#0F6E56" },
                          ]}
                          numberOfLines={1}
                        >
                          {d.category}
                        </Text>
                      </View>
                      <ChevronRight
                        size={16}
                        color={isDark ? "#64748B" : "#94A3B8"}
                        strokeWidth={2}
                      />
                    </View>

                    <Text
                      style={[
                        styles.duaCardTitle,
                        {
                          color: colors.ink,
                          fontFamily:
                            locale === "bn" ? "Bengali" : "OutfitMedium",
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {d.title}
                    </Text>

                    {d.arabic ? (
                      <Text
                        style={[
                          styles.arabicPreview,
                          { color: isDark ? "#A3D4B6" : "#0F6E56" },
                        ]}
                        numberOfLines={2}
                      >
                        {d.arabic}
                      </Text>
                    ) : null}

                    {d.translation ? (
                      <Text
                        style={[
                          styles.translationPreview,
                          {
                            color: isDark ? "#94A3B8" : "#64748B",
                            fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {d.translation}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : (
              <Empty message="No matching duas." />
            )
          ) : filteredCategories.length > 0 ? (
            <View
              style={[
                styles.categoriesGrid,
                isWide && styles.categoriesGridWide,
              ]}
            >
              {filteredCategories.map((c) => {
                const meta = getCategoryMeta(c);
                const Icon = meta.icon;
                const count = categoryCounts[c] ?? 0;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`${c}, ${count} duas`}
                    onPress={() => router.push(`/dua/${encodeURIComponent(c)}`)}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      isWide && styles.categoryCardWide,
                      {
                        backgroundColor: isDark ? colors.surface : "#FFFFFF",
                        borderColor: isDark ? colors.border : "#E2E8F0",
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: isDark ? meta.bgDark : meta.bgLight,
                        },
                      ]}
                    >
                      <Icon size={20} color={meta.color} strokeWidth={2} />
                    </View>

                    <View style={styles.categoryInfoCol}>
                      <Text
                        style={[
                          styles.categoryName,
                          {
                            color: colors.ink,
                            fontFamily:
                              locale === "bn" ? "Bengali" : "OutfitMedium",
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {c}
                      </Text>
                      <View
                        style={[
                          styles.countPill,
                          {
                            backgroundColor: isDark ? "#172E24" : "#E1F5EE",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.countPillText,
                            { color: isDark ? "#34D399" : "#0F6E56" },
                          ]}
                        >
                          {locale === "bn"
                            ? `${count}টি দোয়া`
                            : `${count} duas`}
                        </Text>
                      </View>
                    </View>

                    <ChevronRight
                      size={18}
                      color={isDark ? "#64748B" : "#94A3B8"}
                      strokeWidth={2}
                    />
                  </Pressable>
                );
              })}
            </View>
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
  const { colors, dark: isDark, locale } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const router = useRouter();
  const [search, setSearch] = useState("");

  const rows = bundle?.payload.duas.filter(
    (d) =>
      d.category === category &&
      `${d.title} ${d.translation} ${d.arabic}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const meta = getCategoryMeta(category ?? "");
  const Icon = meta.icon;

  return (
    <Screen title={category ?? "Dua"} back maxWidth={isWide ? 840 : 680}>
      {!bundle ? (
        <ContentUnavailable />
      ) : (
        <>
          {/* Category Banner */}
          <View
            style={[
              styles.categoryHeaderBanner,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: isDark ? colors.border : "#E2E8F0",
              },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? meta.bgDark : meta.bgLight,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                },
              ]}
            >
              <Icon size={22} color={meta.color} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.categoryBannerTitle,
                  {
                    color: colors.ink,
                    fontFamily: locale === "bn" ? "Bengali" : "OutfitMedium",
                  },
                ]}
              >
                {category}
              </Text>
              <Text
                style={[
                  styles.categoryBannerSub,
                  { color: isDark ? "#94A3B8" : "#64748B" },
                ]}
              >
                {`${rows?.length ?? 0} duas`}
              </Text>
            </View>
          </View>

          {/* Search bar inside category */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
                borderColor: isDark ? colors.border : "#E2E8F0",
                marginTop: 0,
              },
            ]}
          >
            <Search
              size={18}
              color={isDark ? "#64748B" : "#94A3B8"}
              strokeWidth={2}
              style={{ marginRight: 10 }}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search duas or categories..."
              placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
              style={[styles.searchInput, { color: colors.ink }]}
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearch("")}
                style={{ padding: 4 }}
              >
                <X
                  size={16}
                  color={isDark ? "#94A3B8" : "#64748B"}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null}
          </View>

          {rows?.length ? (
            <View style={[styles.searchGrid, isWide && styles.searchGridWide]}>
              {rows.map((d) => (
                <Pressable
                  key={d.id}
                  accessibilityRole="button"
                  accessibilityLabel={d.title}
                  onPress={() =>
                    router.push(`/dua/detail/${encodeURIComponent(d.id)}`)
                  }
                  style={({ pressed }) => [
                    styles.searchCard,
                    isWide && styles.searchCardWide,
                    {
                      backgroundColor: isDark ? colors.surface : "#FFFFFF",
                      borderColor: isDark ? colors.border : "#E2E8F0",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={styles.searchCardHeader}>
                    <Text
                      style={[
                        styles.duaCardTitle,
                        {
                          color: colors.ink,
                          flex: 1,
                          fontFamily:
                            locale === "bn" ? "Bengali" : "OutfitMedium",
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {d.title}
                    </Text>
                    <ChevronRight
                      size={18}
                      color={isDark ? "#64748B" : "#94A3B8"}
                      strokeWidth={2}
                    />
                  </View>

                  <Text
                    style={[
                      styles.arabicPreview,
                      {
                        color: isDark ? "#A3D4B6" : "#0F6E56",
                        fontSize: 22,
                        marginVertical: 8,
                      },
                    ]}
                  >
                    {d.arabic}
                  </Text>

                  {d.translation ? (
                    <Text
                      style={[
                        styles.translationPreview,
                        {
                          color: isDark ? "#94A3B8" : "#64748B",
                          fontFamily: locale === "bn" ? "Bengali" : "Outfit",
                        },
                      ]}
                      numberOfLines={3}
                    >
                      {d.translation}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
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
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
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
    <Screen title={d?.title ?? "Dua"} back maxWidth={isWide ? 840 : 680}>
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
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const router = useRouter();
  const q = useAccountQuery(["dua-favorites"], async () =>
    dataOf(await api.GET("/v1/dua/favorites")),
  );
  return (
    <Screen title="Favorites" back maxWidth={isWide ? 840 : 680}>
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

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
  },
  favoritesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  favoritesButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E11D48",
  },
  favoritesBadge: {
    backgroundColor: "#E11D48",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 2,
  },
  favoritesBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
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
  filterTabsScroll: {
    marginBottom: 14,
  },
  filterTabsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
  },
  categoriesGrid: {
    gap: 10,
  },
  categoriesGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryCardWide: {
    width: "48.8%",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryInfoCol: {
    flex: 1,
    gap: 3,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  countPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  searchGrid: {
    gap: 10,
  },
  searchGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  searchCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  searchCardWide: {
    width: "48.8%",
  },
  searchCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  duaCardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  arabicPreview: {
    fontSize: 19,
    fontFamily: "Arabic",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 34,
  },
  translationPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  categoryHeaderBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  categoryBannerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  categoryBannerSub: {
    fontSize: 12,
  },
});
