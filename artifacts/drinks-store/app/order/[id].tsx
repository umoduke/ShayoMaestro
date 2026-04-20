import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOrders, type Order } from "@/context/OrdersContext";
import { useColors } from "@/hooks/useColors";

const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

interface Stage {
  key: Order["status"];
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
}

const STAGES: Stage[] = [
  {
    key: "processing",
    title: "Order Placed",
    description: "We've received your order and it's being prepared.",
    icon: "shopping-bag",
  },
  {
    key: "confirmed",
    title: "Order Confirmed",
    description: "Payment confirmed. We're packaging your spirits.",
    icon: "check-circle",
  },
  {
    key: "shipped",
    title: "Out for Delivery",
    description: "Your order is on its way with our courier.",
    icon: "truck",
  },
  {
    key: "delivered",
    title: "Delivered",
    description: "Enjoy your premium spirits — drink responsibly.",
    icon: "package",
  },
];

const STATUS_COLORS: Record<Order["status"], string> = {
  processing: "#f59e0b",
  confirmed: "#8b5cf6",
  shipped: "#0ea5e9",
  delivered: "#22c55e",
  cancelled: "#e74c3c",
};

const STATUS_LABELS: Record<Order["status"], string> = {
  processing: "Processing",
  confirmed: "Confirmed",
  shipped: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrderTrackingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders } = useOrders();

  const topInset = Platform.OS === "web" ? 24 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const order = useMemo(() => orders.find((o) => o.id === id), [orders, id]);

  if (!order) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background, paddingTop: topInset + 60 }]}>
        <Feather name="package" size={48} color={colors.mutedForeground} />
        <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>
          Order not found
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
        >
          <Text style={[styles.backBtnText, { color: colors.primaryForeground }]}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const isCancelled = order.status === "cancelled";
  const currentIndex = STAGES.findIndex((s) => s.key === order.status);
  const orderDate = new Date(order.date);
  const estDelivery = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000);

  const formatDateTime = (d: Date) =>
    d.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-NG", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const trackingNumber = `ASL-${order.id.slice(-8).toUpperCase()}`;
  const statusColor = STATUS_COLORS[order.status];

  const handleContact = () => {
    Haptics.selectionAsync();
    const phone = "+2348000000000";
    const message = encodeURIComponent(
      `Hello ASL, I'd like to ask about my order ${trackingNumber}.`
    );
    Linking.openURL(`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Hero header */}
      <View style={[styles.hero, { paddingTop: topInset + 14 }]}>
        <View style={styles.heroNav}>
          <Pressable onPress={() => router.back()} style={styles.iconBtnDark}>
            <Feather name="arrow-left" size={20} color="#f5e6c8" />
          </Pressable>
          <Text style={styles.heroNavTitle}>Order Tracking</Text>
          <Pressable onPress={handleContact} style={styles.iconBtnDark}>
            <Feather name="message-circle" size={18} color="#d4a843" />
          </Pressable>
        </View>

        <View style={styles.heroMain}>
          <Text style={styles.heroKicker}>Tracking number</Text>
          <Text style={styles.heroTracking}>{trackingNumber}</Text>
          <View style={[styles.heroStatus, { backgroundColor: statusColor + "22" }]}>
            <View style={[styles.heroStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.heroStatusText, { color: statusColor }]}>
              {STATUS_LABELS[order.status]}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40 }}
      >
        {/* Estimated delivery card */}
        {!isCancelled && order.status !== "delivered" && (
          <View
            style={[
              styles.etaCard,
              { backgroundColor: colors.card, borderColor: "#d4a84355", borderRadius: colors.radius },
            ]}
          >
            <View style={styles.etaIconWrap}>
              <Feather name="clock" size={20} color="#d4a843" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.etaLabel, { color: colors.mutedForeground }]}>
                Estimated Delivery
              </Text>
              <Text style={[styles.etaDate, { color: colors.foreground }]}>
                {formatDate(estDelivery)}
              </Text>
            </View>
          </View>
        )}

        {/* Cancelled banner */}
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Feather name="x-circle" size={20} color="#e74c3c" />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              <Text style={styles.cancelledSub}>
                This order has been cancelled. Contact us for a refund or to re-order.
              </Text>
            </View>
          </View>
        )}

        {/* Timeline */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Tracking Timeline
        </Text>
        <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {STAGES.map((stage, idx) => {
            const isCompleted = !isCancelled && currentIndex >= idx;
            const isCurrent = !isCancelled && currentIndex === idx;
            const isLast = idx === STAGES.length - 1;
            const dotColor = isCompleted
              ? isCurrent
                ? statusColor
                : "#22c55e"
              : isCancelled
              ? "#3a3022"
              : colors.muted;

            return (
              <View key={stage.key} style={styles.stageRow}>
                <View style={styles.stageRail}>
                  <View
                    style={[
                      styles.stageDot,
                      {
                        backgroundColor: isCompleted ? dotColor : colors.background,
                        borderColor: dotColor,
                      },
                    ]}
                  >
                    {isCompleted && !isCurrent && (
                      <Feather name="check" size={11} color="#fff" />
                    )}
                    {isCurrent && (
                      <View style={[styles.pulseDot, { backgroundColor: "#fff" }]} />
                    )}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.stageLine,
                        {
                          backgroundColor:
                            !isCancelled && currentIndex > idx
                              ? "#22c55e"
                              : colors.border,
                        },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.stageContent}>
                  <View style={styles.stageHeader}>
                    <Feather
                      name={stage.icon}
                      size={14}
                      color={isCompleted ? dotColor : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.stageTitle,
                        {
                          color: isCompleted ? colors.foreground : colors.mutedForeground,
                          fontWeight: isCurrent ? "800" : "700",
                        },
                      ]}
                    >
                      {stage.title}
                    </Text>
                    {isCurrent && (
                      <View style={[styles.nowBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.nowBadgeText}>NOW</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stageDesc,
                      { color: colors.mutedForeground, opacity: isCompleted ? 1 : 0.6 },
                    ]}
                  >
                    {stage.description}
                  </Text>
                  {idx === 0 && (
                    <Text style={[styles.stageTime, { color: colors.mutedForeground }]}>
                      {formatDateTime(orderDate)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Delivery details */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
          Delivery Details
        </Text>
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <DetailRow label="Recipient" value={order.name} colors={colors} icon="user" />
          <DetailRow label="Address" value={order.address} colors={colors} icon="map-pin" />
          <DetailRow
            label="Payment"
            value={order.paymentMethod}
            colors={colors}
            icon="credit-card"
          />
        </View>

        {/* Order items */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
          Order Items ({order.items.length})
        </Text>
        <View style={[styles.itemsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {order.items.map((item, idx) => (
            <View key={`${item.drinkId}-${item.sizeLabel}-${idx}`} style={styles.itemRow}>
              <View style={[styles.itemDot, { backgroundColor: item.accentColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.drinkName}
                </Text>
                <Text style={[styles.itemSize, { color: colors.mutedForeground }]}>
                  {item.sizeLabel} · Qty {item.quantity}
                </Text>
              </View>
              <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                {formatNaira(item.sizePrice * item.quantity)}
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total Paid</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatNaira(order.total)}
            </Text>
          </View>
        </View>

        {/* Help button */}
        <Pressable
          onPress={handleContact}
          style={[styles.helpBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
        >
          <Feather name="message-circle" size={18} color={colors.primary} />
          <Text style={[styles.helpBtnText, { color: colors.primary }]}>
            Need help? Contact us on WhatsApp
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
  icon,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  icon: keyof typeof Feather.glyphMap;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={14} color={colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  notFoundTitle: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  backBtn: { paddingHorizontal: 28, paddingVertical: 14, marginTop: 12 },
  backBtnText: { fontSize: 15, fontWeight: "700" },
  hero: {
    backgroundColor: "#0d0b08",
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  heroNavTitle: {
    color: "#f5e6c8",
    fontSize: 16,
    fontWeight: "700",
  },
  iconBtnDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff12",
  },
  heroMain: {
    alignItems: "center",
    gap: 6,
  },
  heroKicker: {
    color: "#9a8a6c",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTracking: {
    color: "#f5e6c8",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1.5,
    fontVariant: ["tabular-nums"],
  },
  heroStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    marginTop: 8,
  },
  heroStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  heroStatusText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  etaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  etaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d4a84320",
    alignItems: "center",
    justifyContent: "center",
  },
  etaLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  etaDate: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  cancelledBanner: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    backgroundColor: "#e74c3c14",
    borderColor: "#e74c3c55",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  cancelledTitle: {
    color: "#e74c3c",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  cancelledSub: {
    color: "#9a8a6c",
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  timelineCard: {
    borderWidth: 1,
    padding: 18,
    paddingBottom: 4,
  },
  stageRow: {
    flexDirection: "row",
    gap: 14,
  },
  stageRail: {
    alignItems: "center",
    width: 22,
  },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageLine: {
    flex: 1,
    width: 2,
    minHeight: 24,
    marginVertical: 2,
  },
  stageContent: {
    flex: 1,
    paddingBottom: 22,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4,
  },
  stageTitle: {
    fontSize: 14,
  },
  nowBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  nowBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  stageDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  stageTime: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
  },
  detailCard: {
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  itemsCard: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemSize: {
    fontSize: 11,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  divider: { height: 1 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 14, fontWeight: "700" },
  totalValue: { fontSize: 20, fontWeight: "800" },
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
    marginTop: 20,
  },
  helpBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
