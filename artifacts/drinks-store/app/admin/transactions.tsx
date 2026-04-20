import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, ApiOrder, ApiTransaction, formatKobo } from "@/lib/api";

const ASL_LOGO = require("@/assets/images/asl-logo.webp");

interface Row {
  transaction: ApiTransaction;
  order: ApiOrder | null;
}

const STATUS_COLORS: Record<string, string> = {
  success: "#27ae60",
  pending: "#e6a817",
  failed: "#e74c3c",
};

export default function AdminTransactions() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const load = useCallback(async () => {
    setError("");
    try {
      const { transactions } = await api.listTransactions();
      setRows(transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user?.isAdmin) {
    return (
      <View style={[styles.blocked, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={48} color={colors.destructive} />
        <Text style={[styles.blockedText, { color: colors.foreground }]}>
          Admin access required
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const totalSuccess = rows
    .filter((r) => r.transaction.status === "success")
    .reduce((sum, r) => sum + r.transaction.amountKobo, 0);
  const successCount = rows.filter(
    (r) => r.transaction.status === "success",
  ).length;
  const pendingCount = rows.filter(
    (r) => r.transaction.status === "pending",
  ).length;
  const failedCount = rows.filter(
    (r) => r.transaction.status === "failed",
  ).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          { backgroundColor: "#0d0b08", paddingTop: topInset + 16 },
        ]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#d4a843" />
          </Pressable>
          <Image source={ASL_LOGO} style={styles.logo} resizeMode="contain" />
          <Pressable onPress={load} style={styles.backBtn}>
            <Feather name="refresh-cw" size={18} color="#d4a843" />
          </Pressable>
        </View>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          Audit every payment received via Paystack
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatKobo(totalSuccess)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Received
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: "#27ae60" }]}>
            {successCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Success
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: "#e6a817" }]}>
            {pendingCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Pending
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: "#e74c3c" }]}>
            {failedCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Failed
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Feather name="alert-circle" size={36} color={colors.destructive} />
          <Text style={{ color: colors.destructive, marginTop: 10 }}>
            {error}
          </Text>
          <Pressable onPress={load} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              Try again
            </Text>
          </Pressable>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={48} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 10 }}>
            No transactions yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.transaction.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: bottomInset + 40,
            gap: 10,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const tx = item.transaction;
            const order = item.order;
            const color = STATUS_COLORS[tx.status] ?? "#888";
            return (
              <View
                style={[
                  styles.txCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View style={styles.txTop}>
                  <View
                    style={[
                      styles.txStatus,
                      { backgroundColor: color + "22" },
                    ]}
                  >
                    <Text style={[styles.txStatusText, { color }]}>
                      {tx.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: colors.foreground }]}>
                    {formatKobo(tx.amountKobo)}
                  </Text>
                </View>
                <Text
                  style={[styles.txRef, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  Ref: {tx.reference}
                </Text>
                {order ? (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.metaRow}>
                      <Feather name="user" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.foreground }]}>
                        {order.customerName}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Feather name="mail" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {order.customerEmail}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Feather name="phone" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                        {order.customerPhone}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                      <Text
                        style={[styles.metaText, { color: colors.mutedForeground }]}
                        numberOfLines={2}
                      >
                        {order.deliveryAddress}
                      </Text>
                    </View>
                  </>
                ) : null}
                <View style={styles.txFooter}>
                  {tx.channel ? (
                    <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>
                      via {tx.channel}
                    </Text>
                  ) : (
                    <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>
                      Paystack
                    </Text>
                  )}
                  <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>
                    {new Date(tx.paidAt ?? tx.createdAt).toLocaleString("en-NG")}
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
  blocked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  blockedText: { fontSize: 18, fontWeight: "700" },
  header: { paddingHorizontal: 16, paddingBottom: 20, gap: 4 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: { padding: 8 },
  logo: { width: 120, height: 36 },
  title: {
    color: "#f5e6c8",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: { color: "#9a8a6c", fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    gap: 2,
  },
  statValue: { fontSize: 14, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.4 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  txCard: { padding: 14, borderWidth: 1, gap: 8 },
  txTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  txStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  txStatusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  txAmount: { fontSize: 18, fontWeight: "800" },
  txRef: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  divider: { height: 1, marginVertical: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 12, flex: 1 },
  txFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  txMeta: { fontSize: 11 },
});
