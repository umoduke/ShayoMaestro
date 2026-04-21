import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useProducts } from "@/context/ProductsContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/data/drinks";
import { ProductImage } from "@/components/ProductImage";

export default function AdminProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { products, removeProduct, refresh } = useProducts();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  if (!user?.isAdmin) {
    router.replace("/(tabs)" as any);
    return null;
  }

  const handleDelete = (id: string, name: string) => {
    const doDelete = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      removeProduct(id);
    };
    if (Platform.OS === "web") {
      if (confirm(`Remove "${name}" from the catalog?`)) doDelete();
    } else {
      Alert.alert("Remove Product", `Remove "${name}" from the catalog?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleReset = () => {
    void refresh();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset + 16,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Products</Text>
          <Pressable
            onPress={() => router.push("/admin/product-form" as any)}
            style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: 100 }]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {products.length} product{products.length !== 1 ? "s" : ""} in catalog
        </Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomInset + 120 }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <Pressable
            onPress={handleReset}
            style={[
              styles.resetBtn,
              {
                borderColor: colors.destructive + "66",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="refresh-cw" size={14} color={colors.destructive} />
            <Text style={[styles.resetText, { color: colors.destructive }]}>
              Reset to defaults
            </Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.productCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={[styles.imageBox, { backgroundColor: item.imageColor + "22" }]}>
              <ProductImage
                id={item.id}
                imageUri={item.imageUri}
                name={item.shortName ?? item.name}
                accentColor={item.accentColor}
                style={styles.productImage}
                containerStyle={styles.productImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.productCategory, { color: colors.mutedForeground }]}>
                {item.category.toUpperCase()} · {item.origin ?? ""}
              </Text>
              <Text style={[styles.productPrice, { color: item.accentColor }]}>
                {formatPrice(item.price, item.currency)}
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/admin/product-form",
                    params: { id: item.id },
                  } as any)
                }
                style={[styles.actionBtn, { backgroundColor: colors.primary + "22" }]}
              >
                <Feather name="edit-2" size={15} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item.id, item.name)}
                style={[styles.actionBtn, { backgroundColor: colors.destructive + "18" }]}
              >
                <Feather name="trash-2" size={15} color={colors.destructive} />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/admin/product-form" as any)}
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: bottomInset + 20,
          },
        ]}
      >
        <Feather name="plus" size={22} color={colors.primaryForeground} />
        <Text style={[styles.fabText, { color: colors.primaryForeground }]}>
          Add Product
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 4 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  subtitle: { fontSize: 13 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  imageBox: {
    width: 64,
    height: 64,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: { width: "80%", height: "90%" },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  productCategory: { fontSize: 11, fontWeight: "500" },
  productPrice: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  actions: { gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  resetText: { fontSize: 13, fontWeight: "600" },
  fab: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 100,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabText: { fontSize: 14, fontWeight: "700" },
});
