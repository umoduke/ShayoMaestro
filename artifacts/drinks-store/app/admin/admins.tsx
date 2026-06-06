import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type AdminEmail } from "@/lib/api";

export default function AdminAdminsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [admins, setAdmins] = useState<AdminEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const load = useCallback(async () => {
    try {
      setError(null);
      const { admins: rows } = await api.listAdmins();
      setAdmins(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = useCallback(async () => {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.addAdmin(trimmed, user?.email);
      setEmail("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add admin");
    } finally {
      setSubmitting(false);
    }
  }, [email, user?.email, load]);

  const handleRemove = useCallback(
    (target: string) => {
      Alert.alert(
        "Remove admin access?",
        `${target} will lose admin access the next time they open the app.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await api.removeAdmin(target);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to remove");
              }
            },
          },
        ],
      );
    },
    [load],
  );

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: "#0d0b08",
            paddingTop: topInset + 16,
            paddingBottom: 20,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: "#f5e6c8" }]}>
            Manage Admins
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Add new admin */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Promote an account
          </Text>
          <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
            Enter the email a person used to sign up. They&apos;ll get admin
            access the next time they log in or reopen the app.
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="person@example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius,
                },
              ]}
            />
            <Pressable
              onPress={handleAdd}
              disabled={submitting}
              style={[
                styles.addBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: submitting ? 0.6 : 1 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Feather name="plus" size={20} color={colors.primaryForeground} />
              )}
            </Pressable>
          </View>
          {error && (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          )}
        </View>

        {/* Current admins */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Current Admins
        </Text>

        {/* Permanent super admin */}
        <View
          style={[
            styles.adminRow,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="shield" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.adminEmail, { color: colors.foreground }]}>
              admin@asl.com
            </Text>
            <Text style={[styles.adminMeta, { color: colors.mutedForeground }]}>
              Permanent owner account
            </Text>
          </View>
          <View style={[styles.lockBadge, { backgroundColor: colors.muted }]}>
            <Feather name="lock" size={13} color={colors.mutedForeground} />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          admins.map((a) => (
            <View
              key={a.email}
              style={[
                styles.adminRow,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.accent + "22" }]}>
                <Text style={[styles.avatarText, { color: colors.accent }]}>
                  {a.email.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.adminEmail, { color: colors.foreground }]} numberOfLines={1}>
                  {a.email}
                </Text>
                <Text style={[styles.adminMeta, { color: colors.mutedForeground }]}>
                  Added {new Date(a.createdAt).toLocaleDateString("en-NG")}
                </Text>
              </View>
              <Pressable
                onPress={() => handleRemove(a.email)}
                style={[styles.removeBtn, { backgroundColor: colors.destructive + "18" }]}
                hitSlop={6}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
            </View>
          ))
        )}

        {!loading && admins.length === 0 && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No promoted admins yet. Add one above.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  blockedText: { fontSize: 18, fontWeight: "700" },
  header: { paddingHorizontal: 16 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  card: { padding: 16, borderWidth: 1, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardHint: { fontSize: 13, lineHeight: 18 },
  inputRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addBtn: {
    width: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontWeight: "800" },
  adminEmail: { fontSize: 14, fontWeight: "700" },
  adminMeta: { fontSize: 12, marginTop: 2 },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  lockBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { fontSize: 14, textAlign: "center", marginTop: 8 },
});
