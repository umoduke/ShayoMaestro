import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useProducts } from "@/context/ProductsContext";
import { useOrders } from "@/context/OrdersContext";
import { formatPrice } from "@/data/drinks";

const ASL_LOGO = require("@/assets/images/asl-logo.webp");

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { products } = useProducts();
  const { orders } = useOrders();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  if (!user?.isAdmin) {
    return (
      <View style={[styles.blocked, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={48} color={colors.destructive} />
        <Text style={[styles.blockedText, { color: colors.foreground }]}>
          Admin access required
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === "processing").length;
  const recentOrders = orders.slice(0, 3);

  const statusColors: Record<string, string> = {
    processing: "#e6a817",
    confirmed: "#3498db",
    shipped: "#9b59b6",
    delivered: "#27ae60",
    cancelled: "#e74c3c",
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomInset + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: "#0d0b08",
            paddingTop: topInset + 16,
            paddingBottom: 24,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#d4a843" />
          </Pressable>
          <Image source={ASL_LOGO} style={styles.logo} resizeMode="contain" />
          <Pressable
            onPress={() => {
              logout();
              router.replace("/(tabs)" as any);
            }}
            style={styles.backBtn}
          >
            <Feather name="log-out" size={18} color="#d4a843" />
          </Pressable>
        </View>
        <Text style={styles.adminBadge}>ADMIN PANEL</Text>
        <Text style={styles.welcomeText}>Welcome, {user.name}</Text>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        {/* Stats row */}
        <View style={styles.statsGrid}>
          {[
            { label: "Products", value: products.length.toString(), icon: "package", color: "#d4a843" },
            { label: "Total Orders", value: orders.length.toString(), icon: "shopping-bag", color: "#3498db" },
            { label: "Pending", value: pendingOrders.toString(), icon: "clock", color: "#e6a817" },
            { label: "Revenue", value: formatPrice(totalRevenue, "₦"), icon: "trending-up", color: "#27ae60" },
          ].map((stat) => (
            <View
              key={stat.label}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.color + "22" }]}>
                <Feather name={stat.icon as any} size={18} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Quick Actions
        </Text>
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => router.push("/admin/products" as any)}
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#d4a843" + "22" }]}>
              <Feather name="package" size={22} color="#d4a843" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>
                Manage Products
              </Text>
              <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>
                Add, edit or remove catalog items
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/admin/orders" as any)}
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#3498db22" }]}>
              <Feather name="shopping-bag" size={22} color="#3498db" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>
                Manage Orders
              </Text>
              <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>
                View and update order statuses
              </Text>
            </View>
            {pendingOrders > 0 && (
              <View style={[styles.badge, { backgroundColor: "#e6a817" }]}>
                <Text style={styles.badgeText}>{pendingOrders}</Text>
              </View>
            )}
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/admin/transactions" as any)}
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#27ae6022" }]}>
              <Feather name="credit-card" size={22} color="#27ae60" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: colors.foreground }]}>
                Transactions
              </Text>
              <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>
                Audit Paystack payments and refunds
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Recent Orders
              </Text>
              <Pressable onPress={() => router.push("/admin/orders" as any)}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                  View all
                </Text>
              </Pressable>
            </View>
            {recentOrders.map((order) => (
              <View
                key={order.id}
                style={[
                  styles.orderRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View
                  style={[
                    styles.orderStatus,
                    { backgroundColor: (statusColors[order.status] ?? "#888") + "22" },
                  ]}
                >
                  <Text
                    style={[
                      styles.orderStatusText,
                      { color: statusColors[order.status] ?? "#888" },
                    ]}
                  >
                    {order.status.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderName, { color: colors.foreground }]} numberOfLines={1}>
                    {order.name}
                  </Text>
                  <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                    {new Date(order.date).toLocaleDateString("en-NG")}
                  </Text>
                </View>
                <Text style={[styles.orderTotal, { color: colors.primary }]}>
                  {formatPrice(order.total, "₦")}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  blockedText: { fontSize: 18, fontWeight: "700" },
  header: { paddingHorizontal: 16, gap: 6 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: { padding: 8 },
  logo: { width: 120, height: 36 },
  adminBadge: {
    color: "#d4a843",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  welcomeText: {
    color: "#f5e6c8",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47%",
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "500" },
  sectionTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "700" },
  actionSub: { fontSize: 12, marginTop: 2 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  orderStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  orderStatusText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  orderInfo: { flex: 1 },
  orderName: { fontSize: 13, fontWeight: "600" },
  orderDate: { fontSize: 11, marginTop: 2 },
  orderTotal: { fontSize: 14, fontWeight: "800" },
});
