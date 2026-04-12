import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useFavorites } from "@/context/FavoritesContext";
import { useOrders } from "@/context/OrdersContext";

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
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const { orders } = useOrders();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

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
        </View>
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

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
          PREFERENCES
        </Text>
        <MenuItem
          icon="bell"
          label="Notifications"
          onPress={() => {}}
        />
        <MenuItem
          icon="moon"
          label="Appearance"
          onPress={() => {}}
        />

        <View style={{ marginTop: 16 }}>
          <MenuItem
            icon="log-out"
            label="Sign Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>
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
});
