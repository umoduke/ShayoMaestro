import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  TIERS,
  tierMeta,
  tierProgress,
  formatNairaFromKobo,
} from "@/lib/loyalty";

export default function MembershipScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const topInset = Platform.OS === "web" ? 24 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // Pull the latest points/tier whenever this screen opens.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const spendKobo = user?.totalSpendKobo ?? 0;
  const points = user?.points ?? 0;
  const progress = tierProgress(spendKobo);
  const currentTier = tierMeta(user?.tier ?? "bronze");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Dark hero header */}
      <View style={[styles.hero, { paddingTop: topInset + 14 }]}>
        <View style={styles.heroNav}>
          <Pressable onPress={() => router.back()} style={styles.iconBtnDark}>
            <Feather name="arrow-left" size={20} color="#f5e6c8" />
          </Pressable>
          <View style={styles.badgePill}>
            <Feather name="award" size={12} color="#0d0b08" />
            <Text style={styles.badgePillText}>Membership</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.heroTitle}>ASL{"\n"}Members Club</Text>
        <View style={styles.goldBar} />
        <Text style={styles.heroSubtitle}>
          Earn a point for every ₦100 you spend and climb the tiers for richer rewards.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 100 }}
      >
        {!user ? (
          <View style={[styles.signinCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.signinIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="lock" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.signinTitle, { color: colors.foreground }]}>
              Sign in to view your rewards
            </Text>
            <Text style={[styles.signinSub, { color: colors.mutedForeground }]}>
              Track your points, tier and benefits in one place.
            </Text>
            <Pressable
              onPress={() => router.push("/auth/login" as any)}
              style={[styles.signinBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            >
              <Text style={[styles.signinBtnText, { color: colors.primaryForeground }]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push("/auth/signup" as any)} style={{ paddingVertical: 8 }}>
              <Text style={[styles.signinAlt, { color: colors.primary }]}>
                Create a free account
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Tier + points summary card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={[styles.summaryKicker, { color: colors.mutedForeground }]}>
                    YOUR TIER
                  </Text>
                  <View style={styles.tierRow}>
                    <View style={[styles.tierDot, { backgroundColor: currentTier.color }]} />
                    <Text style={[styles.tierName, { color: colors.foreground }]}>
                      {currentTier.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.pointsBox}>
                  <Text style={[styles.pointsNum, { color: colors.primary }]}>
                    {points.toLocaleString("en-NG")}
                  </Text>
                  <Text style={[styles.pointsLabel, { color: colors.mutedForeground }]}>
                    points
                  </Text>
                </View>
              </View>

              {/* Progress to next tier */}
              {progress.next ? (
                <View style={{ marginTop: 18 }}>
                  <View style={styles.progressLabels}>
                    <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                      {formatNairaFromKobo(spendKobo)} spent
                    </Text>
                    <Text style={[styles.progressText, { color: colors.foreground }]}>
                      {formatNairaFromKobo(progress.remainingKobo)} to {progress.next.label}
                    </Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.round(progress.progress * 100)}%`,
                          backgroundColor: progress.next.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : (
                <View style={[styles.topTierPill, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="star" size={13} color={colors.primary} />
                  <Text style={[styles.topTierText, { color: colors.primary }]}>
                    You've reached our highest tier — enjoy every benefit.
                  </Text>
                </View>
              )}
            </View>

            {/* Tier ladder with benefits */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              TIERS & BENEFITS
            </Text>
            {TIERS.map((t) => {
              const isCurrent = t.tier === currentTier.tier;
              return (
                <View
                  key={t.tier}
                  style={[
                    styles.tierCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isCurrent ? t.color : colors.border,
                      borderWidth: isCurrent ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.tierCardHead}>
                    <View style={styles.tierRow}>
                      <View style={[styles.tierDot, { backgroundColor: t.color }]} />
                      <Text style={[styles.tierCardName, { color: colors.foreground }]}>
                        {t.label}
                      </Text>
                    </View>
                    {isCurrent && (
                      <View style={[styles.currentPill, { backgroundColor: t.color + "22" }]}>
                        <Text style={[styles.currentPillText, { color: t.color }]}>
                          Current
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.tierThreshold, { color: colors.mutedForeground }]}>
                    {t.minSpendKobo === 0
                      ? "From ₦0 spent"
                      : `From ${formatNairaFromKobo(t.minSpendKobo)} spent`}
                  </Text>
                  <View style={{ gap: 8, marginTop: 10 }}>
                    {t.benefits.map((b) => (
                      <View key={b} style={styles.benefitRow}>
                        <Feather name="check" size={15} color={t.color} />
                        <Text style={[styles.benefitText, { color: colors.foreground }]}>
                          {b}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
              Points are awarded once an order is paid and confirmed. Points expire
              after 12 months of inactivity.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#0d0b08",
    paddingHorizontal: 20,
    paddingBottom: 26,
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
    backgroundColor: "#ffffff14",
    alignItems: "center",
    justifyContent: "center",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#d4a843",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgePillText: {
    color: "#0d0b08",
    fontSize: 12,
    fontWeight: "800",
  },
  heroTitle: {
    color: "#fdf8f0",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  goldBar: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d4a843",
    marginVertical: 14,
  },
  heroSubtitle: {
    color: "#cbbfa6",
    fontSize: 14,
    lineHeight: 21,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  summaryKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tierName: {
    fontSize: 24,
    fontWeight: "800",
  },
  pointsBox: {
    alignItems: "flex-end",
  },
  pointsNum: {
    fontSize: 28,
    fontWeight: "800",
  },
  pointsLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: -2,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  topTierPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  topTierText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tierCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  tierCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tierCardName: {
    fontSize: 18,
    fontWeight: "800",
  },
  currentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  tierThreshold: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  signinCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  signinIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  signinTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  signinSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  signinBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  signinBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  signinAlt: {
    fontSize: 15,
    fontWeight: "600",
  },
});
