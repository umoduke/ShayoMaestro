import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { DrinkCategory, CATEGORIES } from "@/data/drinks";

interface Props {
  selected: DrinkCategory;
  onSelect: (category: DrinkCategory) => void;
}

const FEATHER_ICONS: Record<string, string> = {
  grid: "grid",
  leaf: "feather",
  zap: "zap",
  star: "star",
  droplet: "droplet",
  wind: "wind",
};

const MCI_ICONS: Record<string, string> = {
  cup: "cup",
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
        const iconName = cat.icon;
        const useMCI = !!MCI_ICONS[iconName];

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
            {useMCI ? (
              <MaterialCommunityIcons
                name={iconName as any}
                size={14}
                color={isActive ? colors.primaryForeground : colors.mutedForeground}
              />
            ) : (
              <Feather
                name={FEATHER_ICONS[iconName] as any}
                size={14}
                color={isActive ? colors.primaryForeground : colors.mutedForeground}
              />
            )}
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
