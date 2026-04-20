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
import { DrinkCategory, formatPrice } from "@/data/drinks";
import { useColors } from "@/hooks/useColors";
import { getProductImage } from "@/assets/images/productImages";
import { useProducts } from "@/context/ProductsContext";

const ASL_LOGO = require("@/assets/images/asl-logo.webp");

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { products } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<DrinkCategory>("all");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const filteredDrinks =
    searchQuery.length > 0
      ? products.filter(
          (d) =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : selectedCategory === "all"
      ? products
      : products.filter((d) => d.category === selectedCategory);

  const isSearching = searchQuery.length > 0;
  const featuredProducts = products.filter((d) => d.featured);
  const featured = featuredProducts[0] ?? products[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: bottomInset + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header — dark branded bar */}
      <View
        style={[
          styles.headerBar,
          { paddingTop: topInset + 10 },
        ]}
      >
        <Image
          source={ASL_LOGO}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
              style={styles.iconBtnDark}
            >
              <Feather name="user" size={18} color="#d4a843" />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push("/(tabs)/cart" as any)}
            style={styles.iconBtnDark}
          >
            <Feather name="shopping-bag" size={18} color="#f5e6c8" />
            <CartBadge />
          </Pressable>
        </View>
      </View>

      {/* Tagline */}
      {!isSearching && (
        <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 16 }}>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Authentic Premium Spirits · Nigeria
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search spirits, brands..."
        />
      </View>

      {/* Offers / Sign-up CTA banner */}
      {!isSearching && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/offers" as any);
          }}
          style={styles.offersBanner}
        >
          <View style={styles.offersBannerIcon}>
            <Feather name="gift" size={22} color="#0d0b08" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.offersBannerTitle}>
              {user ? "Your Member Offers" : "Unlock 10% Off Today"}
            </Text>
            <Text style={styles.offersBannerSub}>
              {user
                ? "Tap to view your exclusive promo codes"
                : "Sign up free for special discounts & deals"}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#d4a843" />
        </Pressable>
      )}

      {isSearching ? (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 16 }]}>
            {filteredDrinks.length} result{filteredDrinks.length !== 1 ? "s" : ""} for "{searchQuery}"
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
                  No results found
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <>
          {/* Hero Featured Banner */}
          <View style={{ paddingHorizontal: 16, marginBottom: 28 }}>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/drink/[id]", params: { id: featured.id } } as any)
              }
              style={[
                styles.banner,
                {
                  backgroundColor: featured.imageColor,
                  borderRadius: colors.radius + 4,
                  borderColor: featured.accentColor + "44",
                },
              ]}
            >
              {/* Product image on right */}
              <Image
                source={getProductImage(featured.id, featured.imageUri)}
                style={styles.bannerImage}
                resizeMode="contain"
              />
              {/* Content */}
              <View style={styles.bannerContent}>
                <View style={[styles.bannerTag, { backgroundColor: featured.accentColor }]}>
                  <Text style={styles.bannerTagText}>FEATURED</Text>
                </View>
                <Text style={styles.bannerTitle} numberOfLines={2}>
                  {featured.shortName}
                </Text>
                <Text style={styles.bannerOrigin}>{featured.origin}</Text>
                <Text style={[styles.bannerPrice, { color: featured.accentColor }]}>
                  {formatPrice(featured.price, featured.currency)}
                </Text>
                <View style={[styles.bannerCta, { backgroundColor: featured.accentColor }]}>
                  <Text style={styles.bannerCtaText}>View Details</Text>
                  <Feather name="arrow-right" size={13} color="#fff" />
                </View>
              </View>
            </Pressable>
          </View>

          {/* Featured row */}
          <View style={{ marginBottom: 28 }}>
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
              data={featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4)}
              keyExtractor={(d) => d.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => <DrinkCard drink={item} size="small" />}
              scrollEnabled
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
              Browse by Type
            </Text>
            <CategoryPills selected={selectedCategory} onSelect={setSelectedCategory} />
          </View>

          {/* Product Grid */}
          <View style={styles.grid}>
            {filteredDrinks.map((drink) => (
              <View key={drink.id} style={styles.gridItem}>
                <DrinkCard drink={drink} />
              </View>
            ))}
            {filteredDrinks.length === 0 && (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No products in this category yet
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {},
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#0d0b08",
  },
  logo: {
    width: 110,
    height: 110,
  },
  tagline: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
  },
  iconBtnDark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff12",
  },
  offersBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 22,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#0d0b08",
    borderWidth: 1,
    borderColor: "#d4a84355",
  },
  offersBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#d4a843",
    alignItems: "center",
    justifyContent: "center",
  },
  offersBannerTitle: {
    color: "#f5e6c8",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  offersBannerSub: {
    color: "#9a8a6c",
    fontSize: 12,
  },
  banner: {
    flexDirection: "row",
    overflow: "hidden",
    minHeight: 180,
    borderWidth: 1,
  },
  bannerImage: {
    position: "absolute",
    right: -10,
    top: 0,
    bottom: 0,
    width: 160,
    height: "100%",
  },
  bannerContent: {
    flex: 1,
    padding: 20,
    gap: 6,
    zIndex: 2,
  },
  bannerTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  bannerTagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    maxWidth: 160,
  },
  bannerOrigin: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
  },
  bannerPrice: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  bannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    marginTop: 4,
  },
  bannerCtaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
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
    gap: 14,
  },
  gridItem: {},
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
