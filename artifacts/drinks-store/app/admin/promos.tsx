import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { api, formatKobo, type ApiPromoCode } from "@/lib/api";

function discountLabel(p: ApiPromoCode): string {
  return p.discountType === "percent"
    ? `${p.discountValue}% off`
    : `${formatKobo(p.discountValue)} off`;
}

export default function AdminPromos() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [promos, setPromos] = useState<ApiPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const load = useCallback(async () => {
    setError("");
    try {
      const { promos } = await api.listPromos();
      setPromos(promos);
    } catch {
      setError("Couldn't load promo codes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleActive = async (p: ApiPromoCode) => {
    setBusyId(p.id);
    try {
      await api.updatePromo(p.id, {
        code: p.code,
        type: p.type,
        discountType: p.discountType,
        discountValue: p.discountValue,
        minOrderKobo: p.minOrderKobo,
        maxDiscountKobo: p.maxDiscountKobo,
        expiresAt: p.expiresAt,
        maxUses: p.maxUses,
        perUserLimit: p.perUserLimit,
        eligibleTiers: p.eligibleTiers,
        stackable: p.stackable,
        active: !p.active,
        description: p.description,
      });
      await load();
    } catch {
      Alert.alert("Error", "Couldn't update the code.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (p: ApiPromoCode) => {
    Alert.alert("Delete promo", `Delete code ${p.code}? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusyId(p.id);
          try {
            await api.deletePromo(p.id);
            await load();
          } catch {
            Alert.alert("Error", "Couldn't delete the code.");
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          { backgroundColor: "#0d0b08", paddingTop: topInset + 16 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#d4a843" />
        </Pressable>
        <Text style={styles.headerTitle}>Promo Codes</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={[styles.empty, { color: colors.destructive }]}>{error}</Text>
        ) : promos.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No promo codes yet. Tap + to create one.
          </Text>
        ) : (
          promos.map((p) => {
            const expired =
              p.expiresAt != null && new Date(p.expiresAt).getTime() < Date.now();
            const exhausted = p.maxUses != null && p.usesCount >= p.maxUses;
            return (
              <View
                key={p.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.codeRow}>
                      <Text style={[styles.code, { color: colors.foreground }]}>
                        {p.code}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor:
                              (p.active && !expired && !exhausted
                                ? "#27ae60"
                                : "#e74c3c") + "22",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                p.active && !expired && !exhausted
                                  ? "#27ae60"
                                  : "#e74c3c",
                            },
                          ]}
                        >
                          {expired
                            ? "EXPIRED"
                            : exhausted
                              ? "USED UP"
                              : p.active
                                ? "ACTIVE"
                                : "INACTIVE"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.discount, { color: colors.primary }]}>
                      {discountLabel(p)}
                      {p.stackable ? " · stackable" : ""}
                    </Text>
                    {p.description ? (
                      <Text
                        style={[styles.desc, { color: colors.mutedForeground }]}
                        numberOfLines={2}
                      >
                        {p.description}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.metaRow, { borderColor: colors.border }]}>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    Used {p.usesCount}
                    {p.maxUses != null ? ` / ${p.maxUses}` : ""}
                  </Text>
                  {p.minOrderKobo > 0 && (
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      Min {formatKobo(p.minOrderKobo)}
                    </Text>
                  )}
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {p.perUserLimit}/user
                  </Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => toggleActive(p)}
                    disabled={busyId === p.id}
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                  >
                    <Feather
                      name={p.active ? "pause" : "play"}
                      size={14}
                      color={colors.foreground}
                    />
                    <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                      {p.active ? "Pause" : "Activate"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/admin/promo-form" as any,
                        params: { id: p.id },
                      })
                    }
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                  >
                    <Feather name="edit-2" size={14} color={colors.foreground} />
                    <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(p)}
                    disabled={busyId === p.id}
                    style={[styles.actionBtn, { borderColor: "#e74c3c55" }]}
                  >
                    <Feather name="trash-2" size={14} color="#e74c3c" />
                    <Text style={[styles.actionLabel, { color: "#e74c3c" }]}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/admin/promo-form" as any)}
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: bottomInset + 24 },
        ]}
      >
        <Feather name="plus" size={26} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  blockedText: { fontSize: 18, fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: "#f5e6c8", fontSize: 18, fontWeight: "800" },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
  card: { borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row" },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  code: { fontSize: 17, fontWeight: "800", letterSpacing: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  statusText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  discount: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  desc: { fontSize: 12, marginTop: 4 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  meta: { fontSize: 12, fontWeight: "500" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  actionLabel: { fontSize: 12, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
