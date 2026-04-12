import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPills } from "@/components/CategoryPills";
import { DrinkCard } from "@/components/DrinkCard";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { CartBadge } from "@/components/CartBadge";
import {
  DRINKS,
  FEATURED_DRINKS,
  DrinkCategory,
  getDrinksByCategory,
  searchDrinks,
} from "@/data/drinks";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<DrinkCategory>("all");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const filteredDrinks =
    searchQuery.length > 0
      ? searchDrinks(searchQuery)
      : getDrinksByCategory(selectedCategory);

  const isSearching = searchQuery.length > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topInset + 16, paddingBottom: bottomInset + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {user ? `Hey, ${user.name.split(" ")[0]}` : "Welcome back"}
          </Text>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Find your perfect drink
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {user ? (
            <Pressable
              onPress={() => router.push("/(tabs)/profile" as any)}
              style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {user.name[0].toUpperCase()}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/auth/login" as any)}
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="user" size={20} color={colors.foreground} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push("/(tabs)/cart" as any)}
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="shopping-bag" size={20} color={colors.foreground} />
            <CartBadge />
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search drinks, flavors..."
        />
      </View>

      {isSearching ? (
        /* Search Results */
        <View>
          <Text
            style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 16 }]}
          >
            {filteredDrinks.length} results for "{searchQuery}"
          </Text>
          <View style={styles.grid}>
            {filteredDrinks.map((drink) => (
              <View key={drink.id} style={styles.gridItem}>
                <DrinkCard drink={drink} />
              </View>
            ))}
            {filteredDrinks.length === 0 && (
              <View style={styles.empty}>
                <Feather name="search" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No drinks found
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <>
          {/* Featured Banner */}
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <Pressable
              onPress={() => router.push({ pathname: "/drink/[id]", params: { id: FEATURED_DRINKS[0].id } } as any)}
              style={[
                styles.banner,
                {
                  backgroundColor: FEATURED_DRINKS[0].imageColor,
                  borderRadius: colors.radius + 4,
                },
              ]}
            >
              <View style={styles.bannerContent}>
                <View
                  style={[
                    styles.bannerTag,
                    { backgroundColor: FEATURED_DRINKS[0].accentColor },
                  ]}
                >
                  <Text style={styles.bannerTagText}>FEATURED</Text>
                </View>
                <Text style={styles.bannerTitle}>{FEATURED_DRINKS[0].name}</Text>
                <Text style={styles.bannerSub}>{FEATURED_DRINKS[0].description.slice(0, 60)}...</Text>
                <View style={[styles.bannerCta, { backgroundColor: FEATURED_DRINKS[0].accentColor }]}>
                  <Text style={styles.bannerCtaText}>Shop Now</Text>
                  <Feather name="arrow-right" size={14} color="#fff" />
                </View>
              </View>
              <View style={styles.bannerVisual}>
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="water"
                    size={55}
                    color={FEATURED_DRINKS[0].accentColor}
                  />
                </View>
              </View>
            </Pressable>
          </View>

          {/* Featured Drinks */}
          <View style={{ marginBottom: 24 }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Featured
              </Text>
              <Pressable onPress={() => setSelectedCategory("all")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={FEATURED_DRINKS}
              keyExtractor={(d) => d.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => <DrinkCard drink={item} size="small" />}
              scrollEnabled={FEATURED_DRINKS.length > 2}
            />
          </View>

          {/* Categories */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.foreground, paddingHorizontal: 16, marginBottom: 12 },
              ]}
            >
              Browse by Category
            </Text>
            <CategoryPills selected={selectedCategory} onSelect={setSelectedCategory} />
          </View>

          {/* Drink Grid */}
          <View style={styles.grid}>
            {filteredDrinks.map((drink) => (
              <View key={drink.id} style={styles.gridItem}>
                <DrinkCard drink={drink} />
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  headline: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    flexDirection: "row",
    padding: 20,
    overflow: "hidden",
    minHeight: 160,
  },
  bannerContent: {
    flex: 1,
    gap: 6,
  },
  bannerTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 4,
  },
  bannerTagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bannerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    lineHeight: 18,
  },
  bannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    marginTop: 6,
  },
  bannerCtaText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  bannerVisual: {
    alignItems: "center",
    justifyContent: "center",
    width: 110,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
  },
  grid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  gridItem: {},
  empty: {
    flex: 1,
    alignItems: "center",
    gap: 12,
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
