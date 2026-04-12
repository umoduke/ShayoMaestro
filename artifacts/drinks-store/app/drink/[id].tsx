import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
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

import { DrinkVisual } from "@/components/DrinkVisual";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { getDrinkById } from "@/data/drinks";
import { useColors } from "@/hooks/useColors";

export default function DrinkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const drink = getDrinkById(id);
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
        <Text style={{ color: colors.foreground }}>Drink not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const fav = isFavorite(drink.id);
  const size = drink.sizes[selectedSize];

  const handleAddToCart = () => {
    btnScale.value = withSpring(0.9, {}, () => {
      btnScale.value = withSpring(1);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem({
      drinkId: drink.id,
      drinkName: drink.name,
      sizeLabel: size.label,
      sizePrice: size.price,
      imageColor: drink.imageColor,
      accentColor: drink.accentColor,
    });
    for (let i = 0; i < quantity - 1; i++) {
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
        {/* Hero */}
        <View
          style={[
            styles.hero,
            { backgroundColor: drink.imageColor + "22", paddingTop: topInset + 16 },
          ]}
        >
          <View style={styles.heroNav}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.navBtn, { backgroundColor: colors.card }]}
            >
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </Pressable>
            <Animated.View style={favAnimStyle}>
              <Pressable
                onPress={handleFavorite}
                style={[styles.navBtn, { backgroundColor: colors.card }]}
              >
                <Ionicons
                  name={fav ? "heart" : "heart-outline"}
                  size={20}
                  color={fav ? "#ef4444" : colors.foreground}
                />
              </Pressable>
            </Animated.View>
          </View>

          <View style={styles.heroVisual}>
            <DrinkVisual drink={drink} size={140} />
          </View>

          {/* Tags */}
          {drink.tags && drink.tags.length > 0 && (
            <View style={styles.tags}>
              {drink.tags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: drink.accentColor + "22" }]}
                >
                  <Text style={[styles.tagText, { color: drink.accentColor }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={[styles.info, { backgroundColor: colors.background }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{drink.name}</Text>
            <Text style={[styles.price, { color: drink.accentColor }]}>
              ${size.price.toFixed(2)}
            </Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(drink.rating) ? "star" : "star-outline"}
                size={16}
                color="#f59e0b"
              />
            ))}
            <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
              {drink.rating} ({drink.reviewCount} reviews)
            </Text>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {drink.description}
          </Text>

          {/* Size Selector */}
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
                        ? drink.accentColor + "18"
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
                        selectedSize === idx ? drink.accentColor : colors.foreground,
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
                  ${s.price.toFixed(2)}
                </Text>
              </Pressable>
            ))}
          </View>

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

          {/* Ingredients */}
          <Text style={[styles.label, { color: colors.foreground }]}>Ingredients</Text>
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
                <Text
                  style={[styles.ingredientText, { color: colors.foreground }]}
                >
                  {ing}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
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
            ${(size.price * quantity).toFixed(2)}
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
    paddingBottom: 24,
  },
  heroNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroVisual: {
    alignItems: "center",
    paddingVertical: 16,
  },
  tags: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  info: {
    padding: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
    marginRight: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: "800",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 13,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  sizes: {
    gap: 10,
    marginBottom: 24,
  },
  sizeBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1.5,
  },
  sizeBtnText: {
    fontSize: 14,
  },
  sizeBtnPrice: {
    fontSize: 14,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 24,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 24,
  },
  ingredient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  ingredientText: {
    fontSize: 13,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderTopWidth: 1,
  },
  footerTotal: {
    gap: 2,
  },
  footerTotalLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  footerTotalPrice: {
    fontSize: 20,
    fontWeight: "800",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
