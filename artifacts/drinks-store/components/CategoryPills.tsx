import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { DrinkCategory, CATEGORIES } from "@/data/drinks";

interface Props {
  selected: DrinkCategory;
  onSelect: (category: DrinkCategory) => void;
}

const ICON_MAP: Record<string, { set: "feather" | "mci"; name: string }> = {
  grid: { set: "feather", name: "grid" },
  star: { set: "feather", name: "star" },
  coffee: { set: "feather", name: "coffee" },
  sun: { set: "feather", name: "sun" },
  feather: { set: "feather", name: "feather" },
  zap: { set: "feather", name: "zap" },
  droplet: { set: "feather", name: "droplet" },
};

export function CategoryPills({ selected, onSelect }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.id;
        const icon = ICON_MAP[cat.icon] ?? { set: "feather", name: "circle" };

        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? colors.primary : colors.secondary,
                borderRadius: 100,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather
              name={icon.name as any}
              size={13}
              color={isActive ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.pillText,
                {
                  color: isActive ? colors.primaryForeground : colors.foreground,
                  fontWeight: isActive ? "700" : "500",
                },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
  },
});
