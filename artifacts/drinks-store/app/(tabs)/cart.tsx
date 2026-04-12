import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, removeItem, updateQuantity, total, itemCount, clearCart } = useCart();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Cart</Text>
        {items.length > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              clearCart();
            }}
          >
            <Text style={[styles.clearText, { color: colors.destructive }]}>
              Clear all
            </Text>
          </Pressable>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="shopping-bag" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Your cart is empty
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Add drinks to get started
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)" as any)}
            style={[
              styles.shopBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>
              Browse Drinks
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(i) => `${i.drinkId}-${i.sizeLabel}`}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomInset + 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.item,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                {/* Color Bar */}
                <View
                  style={[
                    styles.colorBar,
                    {
                      backgroundColor: item.accentColor,
                      borderTopLeftRadius: colors.radius,
                      borderBottomLeftRadius: colors.radius,
                    },
                  ]}
                />
                <View style={styles.itemContent}>
                  <View style={styles.itemInfo}>
                    <Text
                      style={[styles.itemName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.drinkName}
                    </Text>
                    <Text style={[styles.itemSize, { color: colors.mutedForeground }]}>
                      {item.sizeLabel}
                    </Text>
                    <Text style={[styles.itemPrice, { color: item.accentColor }]}>
                      ${(item.sizePrice * item.quantity).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.itemActions}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        removeItem(item.drinkId, item.sizeLabel);
                      }}
                      style={[
                        styles.deleteBtn,
                        { backgroundColor: colors.destructive + "18" },
                      ]}
                    >
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </Pressable>

                    <View
                      style={[
                        styles.qtyRow,
                        { backgroundColor: colors.secondary, borderRadius: 100 },
                      ]}
                    >
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          updateQuantity(item.drinkId, item.sizeLabel, item.quantity - 1);
                        }}
                        hitSlop={8}
                      >
                        <Feather name="minus" size={14} color={colors.foreground} />
                      </Pressable>
                      <Text style={[styles.qtyText, { color: colors.foreground }]}>
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          updateQuantity(item.drinkId, item.sizeLabel, item.quantity + 1);
                        }}
                        hitSlop={8}
                      >
                        <Feather name="plus" size={14} color={colors.foreground} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Checkout Footer */}
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
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </Text>
              <Text style={[styles.summaryTotal, { color: colors.foreground }]}>
                ${total.toFixed(2)}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/checkout" as any)}
              style={[
                styles.checkoutBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
              ]}
            >
              <Text
                style={[styles.checkoutBtnText, { color: colors.primaryForeground }]}
              >
                Checkout
              </Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600",
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
  shopBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  shopBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  item: {
    flexDirection: "row",
    borderWidth: 1,
    overflow: "hidden",
  },
  colorBar: {
    width: 5,
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemSize: {
    fontSize: 12,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  itemActions: {
    alignItems: "flex-end",
    gap: 10,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  summaryTotal: {
    fontSize: 22,
    fontWeight: "800",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  checkoutBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
