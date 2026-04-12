import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
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
import { Drink } from "@/data/drinks";
import { DrinkVisual } from "./DrinkVisual";

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
    scale.value = withSpring(0.95, {}, () => {
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
    <Animated.View style={[animStyle, { width: isSmall ? 160 : undefined }]}>
      <Pressable onPress={onPress}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              width: isSmall ? 160 : undefined,
              padding: isSmall ? 12 : 16,
            },
          ]}
        >
          <View
            style={[
              styles.imageContainer,
              {
                backgroundColor: drink.imageColor + "22",
                borderRadius: colors.radius - 4,
                height: isSmall ? 100 : 130,
              },
            ]}
          >
            <DrinkVisual drink={drink} size={isSmall ? 60 : 80} />
            {drink.tags && drink.tags[0] && !isSmall && (
              <View
                style={[
                  styles.tag,
                  {
                    backgroundColor: drink.accentColor,
                    borderRadius: 100,
                  },
                ]}
              >
                <Text style={styles.tagText}>{drink.tags[0]}</Text>
              </View>
            )}
            <Animated.View style={[styles.favBtn, favAnimStyle]}>
              <Pressable onPress={onFavorite} hitSlop={10}>
                <Ionicons
                  name={fav ? "heart" : "heart-outline"}
                  size={18}
                  color={fav ? "#ef4444" : colors.mutedForeground}
                />
              </Pressable>
            </Animated.View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text
              style={[
                styles.name,
                { color: colors.foreground, fontSize: isSmall ? 13 : 15 },
              ]}
              numberOfLines={isSmall ? 1 : 2}
            >
              {drink.name}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#f59e0b" />
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
                {
                  color: drink.accentColor,
                  fontSize: isSmall ? 14 : 16,
                },
              ]}
            >
              ${drink.price.toFixed(2)}
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
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  favBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 100,
    padding: 4,
  },
  name: {
    fontWeight: "600",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  rating: {
    fontSize: 12,
    fontWeight: "500",
  },
  price: {
    fontWeight: "700",
  },
});
