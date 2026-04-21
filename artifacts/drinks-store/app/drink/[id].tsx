import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { formatPrice } from "@/data/drinks";
import { useColors } from "@/hooks/useColors";
import { ProductImage } from "@/components/ProductImage";
import { useProducts } from "@/context/ProductsContext";

export default function DrinkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { getProductById } = useProducts();
  const drink = getProductById(id);
  const [selectedSize, setSelectedSize] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const btnScale = useSharedValue(1);
  const favScale = useSharedValue(1);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));
  const favAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favScale.value }],
  }));

  if (!drink) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Product not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const fav = isFavorite(drink.id);
  const size = drink.sizes[selectedSize];

  const handleAddToCart = () => {
    btnScale.value = withSpring(0.92, {}, () => {
      btnScale.value = withSpring(1);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    for (let i = 0; i < quantity; i++) {
      addItem({
        drinkId: drink.id,
        drinkName: drink.name,
        sizeLabel: size.label,
        sizePrice: size.price,
        imageColor: drink.imageColor,
        accentColor: drink.accentColor,
      });
    }
  };

  const handleFavorite = () => {
    favScale.value = withSpring(1.3, {}, () => {
      favScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(drink.id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
      >
        {/* Hero with product image */}
        <View
          style={[
            styles.hero,
            {
              backgroundColor: drink.imageColor,
              paddingTop: topInset + 12,
            },
          ]}
        >
          {/* Nav */}
          <View style={styles.heroNav}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.navBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
            >
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            <Animated.View style={favAnimStyle}>
              <Pressable
                onPress={handleFavorite}
                style={[styles.navBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
              >
                <Ionicons
                  name={fav ? "heart" : "heart-outline"}
                  size={20}
                  color={fav ? "#e74c3c" : "#fff"}
                />
              </Pressable>
            </Animated.View>
          </View>

          {/* Bottle Image */}
          <View style={styles.heroImageContainer}>
            <ProductImage
              id={drink.id}
              imageUri={drink.imageUri}
              name={drink.shortName ?? drink.name}
              accentColor={drink.accentColor}
              style={styles.heroImage}
              containerStyle={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* Tags */}
          {drink.tags && drink.tags.length > 0 && (
            <View style={styles.tags}>
              {drink.tags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: drink.accentColor + "cc" }]}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {drink.abv && (
                <View style={[styles.tag, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Text style={styles.tagText}>ABV {drink.abv}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={[styles.info, { backgroundColor: colors.background }]}>
          {/* Origin */}
          {drink.origin && (
            <Text style={[styles.origin, { color: colors.mutedForeground }]}>
              {drink.origin.toUpperCase()} · TEQUILA
            </Text>
          )}

          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {drink.name}
            </Text>
          </View>

          {/* Price */}
          <Text style={[styles.mainPrice, { color: drink.accentColor }]}>
            {formatPrice(size.price, drink.currency)}
          </Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(drink.rating) ? "star" : "star-outline"}
                size={15}
                color="#d4a843"
              />
            ))}
            <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
              {drink.rating} · {drink.reviewCount} reviews
            </Text>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {drink.description}
          </Text>

          {/* Size Selector */}
          {drink.sizes.length > 1 && (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Size</Text>
              <View style={styles.sizes}>
                {drink.sizes.map((s, idx) => (
                  <Pressable
                    key={s.label}
                    onPress={() => {
                      setSelectedSize(idx);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.sizeBtn,
                      {
                        borderColor:
                          selectedSize === idx ? drink.accentColor : colors.border,
                        backgroundColor:
                          selectedSize === idx
                            ? drink.accentColor + "1a"
                            : colors.secondary,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sizeBtnText,
                        {
                          color:
                            selectedSize === idx
                              ? drink.accentColor
                              : colors.foreground,
                          fontWeight: selectedSize === idx ? "700" : "500",
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                    <Text
                      style={[
                        styles.sizeBtnPrice,
                        {
                          color:
                            selectedSize === idx
                              ? drink.accentColor
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      {formatPrice(s.price, drink.currency)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Quantity */}
          <Text style={[styles.label, { color: colors.foreground }]}>Quantity</Text>
          <View style={styles.quantityRow}>
            <Pressable
              onPress={() => {
                if (quantity > 1) {
                  setQuantity((q) => q - 1);
                  Haptics.selectionAsync();
                }
              }}
              style={[
                styles.qtyBtn,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: 100,
                  borderColor: colors.border,
                  opacity: quantity <= 1 ? 0.4 : 1,
                },
              ]}
            >
              <Feather name="minus" size={16} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.qtyText, { color: colors.foreground }]}>
              {quantity}
            </Text>
            <Pressable
              onPress={() => {
                setQuantity((q) => q + 1);
                Haptics.selectionAsync();
              }}
              style={[
                styles.qtyBtn,
                { backgroundColor: colors.primary, borderRadius: 100 },
              ]}
            >
              <Feather name="plus" size={16} color={colors.primaryForeground} />
            </Pressable>
          </View>

          {/* Tasting Notes / Ingredients */}
          <Text style={[styles.label, { color: colors.foreground }]}>Tasting Notes</Text>
          <View style={styles.ingredients}>
            {drink.ingredients.map((ing) => (
              <View
                key={ing}
                style={[
                  styles.ingredient,
                  {
                    backgroundColor: colors.secondary,
                    borderRadius: 100,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.ingredientText, { color: colors.foreground }]}>
                  {ing}
                </Text>
              </View>
            ))}
          </View>

          {/* Authenticity note */}
          <View
            style={[
              styles.authenticBanner,
              {
                backgroundColor: colors.primary + "14",
                borderColor: colors.primary + "33",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="shield" size={16} color={colors.primary} />
            <Text style={[styles.authenticText, { color: colors.primary }]}>
              100% Authentic · Sourced from verified international suppliers
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomInset + 16,
          },
        ]}
      >
        <View style={styles.footerTotal}>
          <Text style={[styles.footerTotalLabel, { color: colors.mutedForeground }]}>
            Total
          </Text>
          <Text style={[styles.footerTotalPrice, { color: colors.foreground }]}>
            {formatPrice(size.price * quantity, drink.currency)}
          </Text>
        </View>
        <Animated.View style={[{ flex: 1 }, btnAnimStyle]}>
          <Pressable
            onPress={handleAddToCart}
            style={[
              styles.addBtn,
              {
                backgroundColor: drink.accentColor,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="shopping-bag" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add to Cart</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    minHeight: 300,
  },
  heroNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 220,
  },
  heroImage: {
    width: "60%",
    height: "100%",
  },
  tags: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },
  info: {
    padding: 20,
    gap: 6,
  },
  origin: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  titleRow: {
    marginTop: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  mainPrice: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 13,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 8,
  },
  sizes: {
    gap: 10,
    marginBottom: 12,
  },
  sizeBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1.5,
  },
  sizeBtnText: { fontSize: 14 },
  sizeBtnPrice: { fontSize: 14 },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  qtyText: {
    fontSize: 20,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },
  ingredients: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  ingredient: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  ingredientText: { fontSize: 13, fontWeight: "500" },
  authenticBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  authenticText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderTopWidth: 1,
  },
  footerTotal: { gap: 2 },
  footerTotalLabel: { fontSize: 12, fontWeight: "500" },
  footerTotalPrice: { fontSize: 20, fontWeight: "800" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
