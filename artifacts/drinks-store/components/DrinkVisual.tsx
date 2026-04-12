import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Drink } from "@/data/drinks";

interface Props {
  drink: Drink;
  size?: number;
}

const CATEGORY_ICONS: Record<string, { set: string; name: string }> = {
  "soft-drinks": { set: "mci", name: "cup" },
  juices: { set: "feather", name: "coffee" },
  "energy-drinks": { set: "feather", name: "zap" },
  cocktails: { set: "mci", name: "glass-cocktail" },
  smoothies: { set: "mci", name: "blender" },
  water: { set: "feather", name: "droplet" },
};

export function DrinkVisual({ drink, size = 70 }: Props) {
  const iconSize = Math.round(size * 0.55);
  const info = CATEGORY_ICONS[drink.category] ?? { set: "feather", name: "droplet" };

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={[
          styles.glow,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            backgroundColor: drink.accentColor + "44",
          },
        ]}
      />
      {info.set === "mci" ? (
        <MaterialCommunityIcons name={info.name as any} size={iconSize} color={drink.accentColor} />
      ) : (
        <Feather name={info.name as any} size={iconSize} color={drink.accentColor} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
  },
});
