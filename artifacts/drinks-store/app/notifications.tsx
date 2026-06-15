import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  AppNotification,
  NotificationKind,
  useNotifications,
} from "@/context/NotificationsContext";

const KIND_META: Record<
  NotificationKind,
  { icon: keyof typeof Feather.glyphMap; color: string }
> = {
  order: { icon: "shopping-bag", color: "#d4a843" },
  points: { icon: "star", color: "#e0b34a" },
  tier: { icon: "award", color: "#c9962f" },
  offer: { icon: "gift", color: "#cf6b4a" },
  info: { icon: "bell", color: "#9a8a6c" },
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } =
    useNotifications();

  const topInset = Platform.OS === "web" ? 24 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Dark hero header */}
      <View style={[styles.hero, { paddingTop: topInset + 14 }]}>
        <View style={styles.heroNav}>
          <Pressable onPress={() => router.back()} style={styles.iconBtnDark}>
            <Feather name="arrow-left" size={20} color="#f5e6c8" />
          </Pressable>
          <View style={styles.badgePill}>
            <Feather name="bell" size={12} color="#0d0b08" />
            <Text style={styles.badgePillText}>Notifications</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.heroTitle}>Your{"\n"}Updates</Text>
        <View style={styles.goldBar} />
        <Text style={styles.heroSubtitle}>
          {unreadCount > 0
            ? `You have ${unreadCount} unread ${
                unreadCount === 1 ? "update" : "updates"
              }.`
            : "Order, rewards and tier updates land here."}
        </Text>
      </View>

      {notifications.length > 0 && (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={markAllRead}
            disabled={unreadCount === 0}
            style={[styles.actionBtn, unreadCount === 0 && { opacity: 0.4 }]}
          >
            <Feather name="check-circle" size={14} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>
              Mark all read
            </Text>
          </Pressable>
          <Pressable onPress={clearAll} style={styles.actionBtn}>
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
              Clear all
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 100 }}
      >
        {notifications.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="bell-off" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No notifications yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Place an order or earn points and your updates will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((n: AppNotification) => {
            const meta = KIND_META[n.kind] ?? KIND_META.info;
            return (
              <Pressable
                key={n.id}
                onPress={() => markRead(n.id)}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  !n.read && { borderColor: colors.primary },
                ]}
              >
                <View style={[styles.cardIcon, { backgroundColor: `${meta.color}22` }]}>
                  <Feather name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeader}>
                    <Text
                      style={[styles.cardTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {n.title}
                    </Text>
                    {!n.read && (
                      <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                    {n.body}
                  </Text>
                  <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>
                    {relativeTime(n.createdAt)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#0d0b08",
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  iconBtnDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff12",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#d4a843",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  badgePillText: {
    color: "#0d0b08",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: "#f5e6c8",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  goldBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d4a843",
    marginTop: 12,
    marginBottom: 12,
  },
  heroSubtitle: {
    color: "#9a8a6c",
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  cardTime: {
    fontSize: 11,
    marginTop: 8,
  },
  emptyCard: {
    alignItems: "center",
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 240,
  },
});
