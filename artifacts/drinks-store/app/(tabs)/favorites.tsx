import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DrinkCard } from "@/components/DrinkCard";
import { useFavorites } from "@/context/FavoritesContext";
import { DRINKS } from "@/data/drinks";
import { useColors } from "@/hooks/useColors";

export default function FavoritesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favorites } = useFavorites();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const favoriteDrinks = DRINKS.filter((d) => favorites.includes(d.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Favorites</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {favoriteDrinks.length} saved
        </Text>
      </View>

      {favoriteDrinks.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="heart" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No favorites yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Tap the heart icon on any drink to save it here
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)" as any)}
            style={[
              styles.browseBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.browseBtnText, { color: colors.primaryForeground }]}>
              Browse Drinks
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={favoriteDrinks}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: bottomInset + 100,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <DrinkCard drink={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  count: {
    fontSize: 14,
    fontWeight: "500",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  browseBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  browseBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
