import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, type PromoInput } from "@/lib/api";

type DiscountType = "percent" | "flat";

const TIERS = ["bronze", "silver", "gold"] as const;

export default function PromoForm() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === "string" ? params.id : null;

  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("seasonal");
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [eligibleTiers, setEligibleTiers] = useState<string[]>([]);
  const [stackable, setStackable] = useState(false);
  const [active, setActive] = useState(true);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const { promos } = await api.listPromos();
        const p = promos.find((x) => x.id === editingId);
        if (!p || cancelled) return;
        setCode(p.code);
        setDescription(p.description ?? "");
        setType(p.type);
        setDiscountType(p.discountType);
        setDiscountValue(
          p.discountType === "flat"
            ? String(p.discountValue / 100)
            : String(p.discountValue),
        );
        setMinOrder(p.minOrderKobo > 0 ? String(p.minOrderKobo / 100) : "");
        setMaxDiscount(
          p.maxDiscountKobo != null ? String(p.maxDiscountKobo / 100) : "",
        );
        setMaxUses(p.maxUses != null ? String(p.maxUses) : "");
        setPerUserLimit(String(p.perUserLimit));
        setEligibleTiers(p.eligibleTiers ?? []);
        setStackable(p.stackable);
        setActive(p.active);
      } catch {
        Alert.alert("Error", "Couldn't load that code.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const toggleTier = (tier: string) => {
    setEligibleTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier],
    );
  };

  const handleSave = async () => {
    const trimmedCode = code.trim().toUpperCase();
    const value = Number(discountValue);
    if (!trimmedCode) {
      Alert.alert("Missing code", "Enter a promo code.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert("Invalid discount", "Enter a discount value greater than 0.");
      return;
    }
    if (discountType === "percent" && value > 100) {
      Alert.alert("Invalid discount", "Percentage cannot exceed 100.");
      return;
    }

    const toKobo = (v: string) => Math.round(Number(v) * 100);
    const payload: PromoInput = {
      code: trimmedCode,
      type: type.trim() || "seasonal",
      discountType,
      discountValue: discountType === "flat" ? toKobo(discountValue) : value,
      minOrderKobo: minOrder.trim() ? toKobo(minOrder) : 0,
      maxDiscountKobo:
        discountType === "percent" && maxDiscount.trim()
          ? toKobo(maxDiscount)
          : null,
      maxUses: maxUses.trim() ? Math.round(Number(maxUses)) : null,
      perUserLimit: perUserLimit.trim() ? Math.round(Number(perUserLimit)) : 1,
      eligibleTiers: eligibleTiers.length > 0 ? eligibleTiers : null,
      stackable,
      active,
      description: description.trim() || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.updatePromo(editingId, payload);
      } else {
        await api.createPromo(payload);
      }
      router.back();
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Couldn't save the code.",
      );
    } finally {
      setSaving(false);
    }
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

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.secondary,
      borderColor: colors.border,
      borderRadius: colors.radius,
      color: colors.foreground,
    },
  ];

  const label = (t: string) => (
    <Text style={[styles.label, { color: colors.mutedForeground }]}>{t}</Text>
  );

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
        <Text style={styles.headerTitle}>
          {editingId ? "Edit Promo" : "New Promo"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 120, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          <View>
            {label("Code")}
            <TextInput
              style={[...inputStyle, { letterSpacing: 1 }]}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="e.g. WELCOME10"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
            />
          </View>

          <View>
            {label("Description (optional)")}
            <TextInput
              style={inputStyle}
              value={description}
              onChangeText={setDescription}
              placeholder="Shown to customers when applied"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View>
            {label("Discount type")}
            <View style={styles.segment}>
              {(["percent", "flat"] as DiscountType[]).map((dt) => (
                <Pressable
                  key={dt}
                  onPress={() => setDiscountType(dt)}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor:
                        discountType === dt ? colors.primary : colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        discountType === dt
                          ? colors.primaryForeground
                          : colors.foreground,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {dt === "percent" ? "Percentage" : "Fixed (₦)"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            {label(discountType === "percent" ? "Discount (%)" : "Discount (₦)")}
            <TextInput
              style={inputStyle}
              value={discountValue}
              onChangeText={setDiscountValue}
              placeholder={discountType === "percent" ? "10" : "2500"}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>

          {discountType === "percent" && (
            <View>
              {label("Max discount cap (₦, optional)")}
              <TextInput
                style={inputStyle}
                value={maxDiscount}
                onChangeText={setMaxDiscount}
                placeholder="No cap"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
          )}

          <View>
            {label("Minimum order (₦, optional)")}
            <TextInput
              style={inputStyle}
              value={minOrder}
              onChangeText={setMinOrder}
              placeholder="No minimum"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              {label("Total uses (optional)")}
              <TextInput
                style={inputStyle}
                value={maxUses}
                onChangeText={setMaxUses}
                placeholder="Unlimited"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              {label("Per customer")}
              <TextInput
                style={inputStyle}
                value={perUserLimit}
                onChangeText={setPerUserLimit}
                placeholder="1"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View>
            {label("Eligible tiers (none = everyone)")}
            <View style={styles.segment}>
              {TIERS.map((tier) => {
                const on = eligibleTiers.includes(tier);
                return (
                  <Pressable
                    key={tier}
                    onPress={() => toggleTier(tier)}
                    style={[
                      styles.segmentBtn,
                      {
                        backgroundColor: on ? colors.primary : colors.secondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: on ? colors.primaryForeground : colors.foreground,
                        fontWeight: "700",
                        fontSize: 13,
                        textTransform: "capitalize",
                      }}
                    >
                      {tier}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.switchRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>
                Stackable
              </Text>
              <Text style={[styles.switchHint, { color: colors.mutedForeground }]}>
                Combine with member (5%) pricing instead of taking the larger one
              </Text>
            </View>
            <Switch value={stackable} onValueChange={setStackable} />
          </View>

          <View style={[styles.switchRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>
                Active
              </Text>
              <Text style={[styles.switchHint, { color: colors.mutedForeground }]}>
                Customers can only redeem active codes
              </Text>
            </View>
            <Switch value={active} onValueChange={setActive} />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
                {editingId ? "Save Changes" : "Create Code"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      )}
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
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 12 },
  segment: { flexDirection: "row", gap: 8 },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  switchLabel: { fontSize: 15, fontWeight: "700" },
  switchHint: { fontSize: 12, marginTop: 2 },
  saveBtn: { alignItems: "center", paddingVertical: 15, marginTop: 6 },
  saveText: { fontSize: 16, fontWeight: "800" },
});
