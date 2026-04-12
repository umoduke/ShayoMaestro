import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  Image,
  Pressable,
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

import { useFavorites } from "@/context/FavoritesContext";
import { useColors } from "@/hooks/useColors";
import { Drink, formatPrice } from "@/data/drinks";
import { getProductImage } from "@/assets/images/productImages";

interface Props {
  drink: Drink;
  size?: "small" | "large";
}

export function DrinkCard({ drink, size = "large" }: Props) {
  const colors = useColors();
  const { toggleFavorite, isFavorite } = useFavorites();
  const scale = useSharedValue(1);
  const favScale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const favAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favScale.value }],
  }));

  const onPress = useCallback(() => {
    scale.value = withSpring(0.96, {}, () => {
      scale.value = withSpring(1);
    });
    router.push({ pathname: "/drink/[id]", params: { id: drink.id } } as any);
  }, [drink.id, scale]);

  const onFavorite = useCallback(
    (e: any) => {
      e.stopPropagation?.();
      favScale.value = withSpring(1.3, {}, () => {
        favScale.value = withSpring(1);
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleFavorite(drink.id);
    },
    [drink.id, toggleFavorite, favScale]
  );

  const fav = isFavorite(drink.id);
  const isSmall = size === "small";

  return (
    <Animated.View style={[animStyle, { width: isSmall ? 170 : undefined }]}>
      <Pressable onPress={onPress}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              padding: isSmall ? 12 : 14,
            },
          ]}
        >
          {/* Product Image */}
          <View
            style={[
              styles.imageContainer,
              {
                backgroundColor: drink.imageColor + "18",
                borderRadius: colors.radius - 2,
                height: isSmall ? 130 : 160,
              },
            ]}
          >
            <Image
              source={getProductImage(drink.id, drink.imageUri)}
              style={styles.productImage}
              resizeMode="contain"
            />
            {/* Tags */}
            {drink.tags && drink.tags[0] && (
              <View
                style={[
                  styles.tag,
                  { backgroundColor: drink.accentColor + "ee", borderRadius: 100 },
                ]}
              >
                <Text style={styles.tagText}>{drink.tags[0].toUpperCase()}</Text>
              </View>
            )}
            {/* Favorite */}
            <Animated.View style={[styles.favBtn, favAnimStyle]}>
              <Pressable onPress={onFavorite} hitSlop={10}>
                <Ionicons
                  name={fav ? "heart" : "heart-outline"}
                  size={18}
                  color={fav ? "#e74c3c" : colors.mutedForeground}
                />
              </Pressable>
            </Animated.View>
          </View>

          {/* Info */}
          <View style={{ marginTop: 10, gap: 3 }}>
            {/* Origin badge */}
            {drink.origin && (
              <Text style={[styles.origin, { color: colors.mutedForeground }]}>
                {drink.origin} · {drink.abv}
              </Text>
            )}
            <Text
              style={[
                styles.name,
                { color: colors.foreground, fontSize: isSmall ? 13 : 15 },
              ]}
              numberOfLines={isSmall ? 2 : 2}
            >
              {isSmall ? drink.shortName : drink.name}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#d4a843" />
              <Text style={[styles.rating, { color: colors.mutedForeground }]}>
                {drink.rating}
                {!isSmall && (
                  <Text style={{ fontSize: 11 }}> ({drink.reviewCount})</Text>
                )}
              </Text>
            </View>
            <Text
              style={[
                styles.price,
                { color: drink.accentColor, fontSize: isSmall ? 14 : 16 },
              ]}
            >
              {formatPrice(drink.price, drink.currency)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "75%",
    height: "90%",
  },
  tag: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  favBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 100,
    padding: 5,
  },
  origin: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontWeight: "700",
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: "500",
  },
  price: {
    fontWeight: "800",
    marginTop: 2,
  },
});
