import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Alert,
  Modal,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useFavorites } from "@/context/FavoritesContext";
import { useOrders } from "@/context/OrdersContext";
import { tierMeta } from "@/lib/loyalty";
import {
  useSettings,
  ThemeMode,
  NotificationPrefs,
} from "@/context/SettingsContext";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string; desc: string }[] = [
  { mode: "system", label: "System", icon: "smartphone", desc: "Match your device setting" },
  { mode: "light", label: "Light", icon: "sun", desc: "Always use the light theme" },
  { mode: "dark", label: "Dark", icon: "moon", desc: "Always use the dark theme" },
];

const NOTIFICATION_OPTIONS: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
  { key: "orderUpdates", label: "Order updates", desc: "Status changes and delivery alerts" },
  { key: "promotions", label: "Promotions & offers", desc: "Discounts and special deals" },
  { key: "newArrivals", label: "New arrivals", desc: "Be first to know about new bottles" },
];

interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, value, onPress, danger }: MenuItemProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.menuItem,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <View
        style={[
          styles.menuIcon,
          {
            backgroundColor: danger
              ? colors.destructive + "18"
              : colors.secondary,
          },
        ]}
      >
        <Feather
          name={icon as any}
          size={18}
          color={danger ? colors.destructive : colors.foreground}
        />
      </View>
      <Text
        style={[
          styles.menuLabel,
          { color: danger ? colors.destructive : colors.foreground },
        ]}
      >
        {label}
      </Text>
      {value && (
        <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      )}
      {!danger && (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();
  const { favorites } = useFavorites();
  const { orders } = useOrders();

  React.useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const tier = user ? tierMeta(user.tier ?? "bronze") : null;
  const points = user?.points ?? 0;
  const { themeMode, setThemeMode, notifications, setNotification } = useSettings();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const themeLabel =
    themeMode === "system" ? "System" : themeMode === "light" ? "Light" : "Dark";
  const activeNotifications =
    NOTIFICATION_OPTIONS.filter((o) => notifications[o.key]).length;

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
      router.replace("/(tabs)" as any);
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          logout();
          router.replace("/(tabs)" as any);
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.loggedOut, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <View style={[styles.guestIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="user" size={48} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.guestTitle, { color: colors.foreground }]}>
          Sign in to your account
        </Text>
        <Text style={[styles.guestText, { color: colors.mutedForeground }]}>
          Access your orders, favorites, and settings
        </Text>
        <Pressable
          onPress={() => router.push("/auth/login" as any)}
          style={[
            styles.loginBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>
            Sign In
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push("/auth/signup" as any)}>
          <Text style={[styles.signupText, { color: colors.primary }]}>
            Create an account
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.profileHeader,
          { backgroundColor: colors.primary + "18", paddingTop: topInset + 24 },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {user.name[0].toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.foreground }]}>{user.name}</Text>
        <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
          {user.email}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {orders.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Orders
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {favorites.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Favorites
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {points.toLocaleString("en-NG")}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Points
            </Text>
          </View>
        </View>

        {tier && (
          <Pressable
            onPress={() => router.push("/membership" as any)}
            style={[styles.tierBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.tierBadgeDot, { backgroundColor: tier.color }]} />
            <Text style={[styles.tierBadgeText, { color: colors.foreground }]}>
              {tier.label} Member
            </Text>
            <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Menu */}
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          ACCOUNT
        </Text>
        <MenuItem
          icon="package"
          label="My Orders"
          value={`${orders.length}`}
          onPress={() => router.push("/(tabs)/orders" as any)}
        />
        <MenuItem
          icon="heart"
          label="Favorites"
          value={`${favorites.length}`}
          onPress={() => router.push("/(tabs)/favorites" as any)}
        />
        <MenuItem
          icon="award"
          label="Members Club"
          value={tier ? tier.label : undefined}
          onPress={() => router.push("/membership" as any)}
        />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
          PREFERENCES
        </Text>
        <MenuItem
          icon="bell"
          label="Notifications"
          value={`${activeNotifications} on`}
          onPress={() => setNotificationsOpen(true)}
        />
        <MenuItem
          icon="moon"
          label="Appearance"
          value={themeLabel}
          onPress={() => setAppearanceOpen(true)}
        />

        {user.isAdmin && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
              ADMINISTRATION
            </Text>
            <MenuItem
              icon="settings"
              label="Admin Panel"
              value="Manage store"
              onPress={() => router.push("/admin" as any)}
            />
          </>
        )}

        <View style={{ marginTop: 16 }}>
          <MenuItem
            icon="log-out"
            label="Sign Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      {/* Appearance modal */}
      <Modal
        visible={appearanceOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAppearanceOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setAppearanceOpen(false)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: bottomInset + 16,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Appearance
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Choose how the app looks
            </Text>
            {THEME_OPTIONS.map((opt) => {
              const selected = themeMode === opt.mode;
              return (
                <Pressable
                  key={opt.mode}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setThemeMode(opt.mode);
                  }}
                  style={[
                    styles.optionRow,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected
                        ? colors.primary + "12"
                        : colors.background,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Feather
                      name={opt.icon as any}
                      size={18}
                      color={selected ? colors.primary : colors.foreground}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                      {opt.desc}
                    </Text>
                  </View>
                  {selected && (
                    <Feather name="check" size={20} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Notifications modal */}
      <Modal
        visible={notificationsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setNotificationsOpen(false)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: bottomInset + 16,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Notifications
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Pick what you want to hear about
            </Text>
            {NOTIFICATION_OPTIONS.map((opt) => (
              <View
                key={opt.key}
                style={[
                  styles.optionRow,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                    {opt.desc}
                  </Text>
                </View>
                <Switch
                  value={notifications[opt.key]}
                  onValueChange={(v) => {
                    Haptics.selectionAsync();
                    setNotification(opt.key, v);
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loggedOut: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  guestIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  guestText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  loginBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  signupText: {
    fontSize: 15,
    fontWeight: "600",
  },
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
  },
  userEmail: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 24,
  },
  stat: {
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  tierBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tierBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  menuValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
