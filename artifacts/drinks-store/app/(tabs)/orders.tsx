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

import { useOrders, Order } from "@/context/OrdersContext";
import { useColors } from "@/hooks/useColors";

const STATUS_COLORS: Record<Order["status"], string> = {
  processing: "#f59e0b",
  shipped: "#0ea5e9",
  delivered: "#22c55e",
};

const STATUS_LABELS: Record<Order["status"], string> = {
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orders } = useOrders();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Orders</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="package" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No orders yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Your order history will appear here
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)" as any)}
            style={[
              styles.browseBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.browseBtnText, { color: colors.primaryForeground }]}>
              Start Shopping
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: bottomInset + 100,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: order }) => {
            const statusColor = STATUS_COLORS[order.status];
            return (
              <View
                style={[
                  styles.orderCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                {/* Order Header */}
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={[styles.orderId, { color: colors.mutedForeground }]}>
                      #{order.id.slice(-6).toUpperCase()}
                    </Text>
                    <Text style={[styles.orderDate, { color: colors.foreground }]}>
                      {formatDate(order.date)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColor + "22" },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {STATUS_LABELS[order.status]}
                    </Text>
                  </View>
                </View>

                {/* Order Items */}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                {order.items.slice(0, 3).map((item, idx) => (
                  <View key={`${item.drinkId}-${item.sizeLabel}-${idx}`} style={styles.orderItem}>
                    <View
                      style={[
                        styles.orderItemDot,
                        { backgroundColor: item.accentColor },
                      ]}
                    />
                    <Text
                      style={[styles.orderItemName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.drinkName}
                    </Text>
                    <Text style={[styles.orderItemQty, { color: colors.mutedForeground }]}>
                      x{item.quantity}
                    </Text>
                    <Text style={[styles.orderItemPrice, { color: colors.foreground }]}>
                      ${(item.sizePrice * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                {order.items.length > 3 && (
                  <Text style={[styles.moreItems, { color: colors.mutedForeground }]}>
                    +{order.items.length - 3} more items
                  </Text>
                )}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Order Footer */}
                <View style={styles.orderFooter}>
                  <View>
                    <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>
                      {order.paymentMethod}
                    </Text>
                    <Text style={[styles.footerAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {order.address}
                    </Text>
                  </View>
                  <Text style={[styles.orderTotal, { color: colors.foreground }]}>
                    ${order.total.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
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
  orderCard: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orderItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  orderItemQty: {
    fontSize: 13,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  moreItems: {
    fontSize: 12,
    paddingLeft: 18,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  footerAddress: {
    fontSize: 12,
    maxWidth: 200,
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: "800",
  },
});
