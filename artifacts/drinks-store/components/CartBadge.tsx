import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";

export function CartBadge() {
  const { itemCount } = useCart();
  const colors = useColors();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (itemCount > 0) {
      scale.value = withSequence(withSpring(1.4), withSpring(1));
    }
  }, [itemCount, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (itemCount === 0) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: colors.accent, borderRadius: 100 },
        animStyle,
      ]}
    >
      <Text style={styles.badgeText}>{itemCount > 99 ? "99+" : itemCount}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
