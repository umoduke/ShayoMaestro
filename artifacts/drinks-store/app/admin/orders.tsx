import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useOrders, Order } from "@/context/OrdersContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/data/drinks";

const STATUS_OPTIONS: Order["status"][] = [
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_CONFIG: Record<
  Order["status"],
  { color: string; icon: string; label: string }
> = {
  processing: { color: "#e6a817", icon: "clock", label: "Processing" },
  confirmed: { color: "#3498db", icon: "check-circle", label: "Confirmed" },
  shipped: { color: "#9b59b6", icon: "truck", label: "Shipped" },
  delivered: { color: "#27ae60", icon: "check", label: "Delivered" },
  cancelled: { color: "#e74c3c", icon: "x-circle", label: "Cancelled" },
};

export default function AdminOrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { orders, updateOrderStatus, removeOrder } = useOrders();
  const [filter, setFilter] = useState<Order["status"] | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  if (!user?.isAdmin) {
    router.replace("/(tabs)" as any);
    return null;
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const handleUpdateStatus = (order: Order, status: Order["status"]) => {
    Haptics.selectionAsync();
    updateOrderStatus(order.id, status);
  };

  const handleDelete = (id: string) => {
    const doDelete = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      removeOrder(id);
    };
    if (Platform.OS === "web") {
      if (confirm("Remove this order from the list?")) doDelete();
    } else {
      Alert.alert("Remove Order", "Remove this order from the list?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doDelete },
      ]);
    }
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
          <Text style={[styles.title, { color: colors.foreground }]}>Orders</Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filtered.length} / {orders.length}
          </Text>
        </View>

        {/* Filter pills */}
        <FlatList
          horizontal
          data={["all", ...STATUS_OPTIONS] as (Order["status"] | "all")[]}
          keyExtractor={(s) => s}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item: s }) => {
            const cfg = s !== "all" ? STATUS_CONFIG[s] : null;
            const isActive = filter === s;
            return (
              <Pressable
                onPress={() => setFilter(s)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? (cfg?.color ?? colors.primary)
                      : colors.secondary,
                    borderColor: isActive
                      ? (cfg?.color ?? colors.primary)
                      : colors.border,
                    borderRadius: 100,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive ? "#fff" : colors.foreground,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {s === "all" ? "All" : STATUS_CONFIG[s].label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No {filter !== "all" ? filter : ""} orders yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomInset + 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: order }) => {
            const cfg = STATUS_CONFIG[order.status];
            const isOpen = expanded === order.id;
            return (
              <View
                style={[
                  styles.orderCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isOpen ? cfg.color + "66" : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                {/* Order header */}
                <Pressable
                  onPress={() => setExpanded(isOpen ? null : order.id)}
                  style={styles.orderHeader}
                >
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: cfg.color + "22" },
                    ]}
                  >
                    <Feather name={cfg.icon as any} size={12} color={cfg.color} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>
                      {cfg.label.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.orderMeta}>
                    <Text style={[styles.orderName, { color: colors.foreground }]}>
                      {order.name}
                    </Text>
                    <Text style={[styles.orderId, { color: colors.mutedForeground }]}>
                      #{order.id.slice(-6).toUpperCase()} ·{" "}
                      {new Date(order.date).toLocaleDateString("en-NG")}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={[styles.orderTotal, { color: cfg.color }]}>
                      {formatPrice(order.total, "₦")}
                    </Text>
                    <Feather
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={colors.mutedForeground}
                    />
                  </View>
                </Pressable>

                {/* Expanded details */}
                {isOpen && (
                  <View style={[styles.orderDetails, { borderTopColor: colors.border }]}>
                    <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                      Delivery
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {order.address}
                    </Text>

                    <Text
                      style={[styles.detailLabel, { color: colors.mutedForeground, marginTop: 8 }]}
                    >
                      Payment
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {order.paymentMethod}
                    </Text>

                    <Text
                      style={[styles.detailLabel, { color: colors.mutedForeground, marginTop: 8 }]}
                    >
                      Items ({order.items.length})
                    </Text>
                    {order.items.map((item, idx) => (
                      <View
                        key={`${item.drinkId}-${idx}`}
                        style={[styles.itemRow, { borderColor: colors.border }]}
                      >
                        <View style={[styles.itemDot, { backgroundColor: item.accentColor }]} />
                        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                          {item.drinkName}
                        </Text>
                        <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                          ×{item.quantity}
                        </Text>
                        <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                          {formatPrice(item.sizePrice * item.quantity, "₦")}
                        </Text>
                      </View>
                    ))}

                    {/* Status update */}
                    <Text
                      style={[styles.detailLabel, { color: colors.mutedForeground, marginTop: 12 }]}
                    >
                      Update Status
                    </Text>
                    <View style={styles.statusRow}>
                      {STATUS_OPTIONS.map((s) => {
                        const scfg = STATUS_CONFIG[s];
                        const isActive = order.status === s;
                        return (
                          <Pressable
                            key={s}
                            onPress={() => handleUpdateStatus(order, s)}
                            style={[
                              styles.statusBtn,
                              {
                                backgroundColor: isActive ? scfg.color : scfg.color + "18",
                                borderRadius: 8,
                              },
                            ]}
                          >
                            <Feather
                              name={scfg.icon as any}
                              size={12}
                              color={isActive ? "#fff" : scfg.color}
                            />
                            <Text
                              style={[
                                styles.statusBtnText,
                                { color: isActive ? "#fff" : scfg.color },
                              ]}
                            >
                              {scfg.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Delete */}
                    <Pressable
                      onPress={() => handleDelete(order.id)}
                      style={[styles.deleteBtn, { borderColor: colors.destructive + "44" }]}
                    >
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                      <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>
                        Remove Order
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 0, borderBottomWidth: 1, gap: 0 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  count: { fontSize: 13, fontWeight: "500" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterText: { fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontWeight: "500" },
  orderCard: { borderWidth: 1, overflow: "hidden" },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  orderMeta: { flex: 1 },
  orderName: { fontSize: 14, fontWeight: "700" },
  orderId: { fontSize: 11, marginTop: 2 },
  orderTotal: { fontSize: 15, fontWeight: "800" },
  orderDetails: { borderTopWidth: 1, padding: 14, gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  detailValue: { fontSize: 13 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  itemDot: { width: 8, height: 8, borderRadius: 4 },
  itemName: { flex: 1, fontSize: 13 },
  itemQty: { fontSize: 12 },
  itemPrice: { fontSize: 13, fontWeight: "600" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusBtnText: { fontSize: 12, fontWeight: "600" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 13, fontWeight: "600" },
});
