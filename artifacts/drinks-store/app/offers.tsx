import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { useOffers, type Offer } from "@/context/OffersContext";
import { useColors } from "@/hooks/useColors";

export default function OffersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { offers } = useOffers();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 24 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const isLoggedIn = !!user;

  const copy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Dark hero header */}
      <View style={[styles.hero, { paddingTop: topInset + 14 }]}>
        <View style={styles.heroNav}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtnDark}
          >
            <Feather name="arrow-left" size={20} color="#f5e6c8" />
          </Pressable>
          <View style={styles.badgePill}>
            <Feather name="gift" size={12} color="#0d0b08" />
            <Text style={styles.badgePillText}>Special Offers</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.heroTitle}>Members{"\n"}Save More</Text>
        <View style={styles.goldBar} />
        <Text style={styles.heroSubtitle}>
          Unlock exclusive discounts on Nigeria's finest premium spirits.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: bottomInset + 100,
        }}
      >
        {/* Sign-up CTA for guests */}
        {!isLoggedIn && (
          <View style={styles.signupCard}>
            <View style={styles.signupIconWrap}>
              <Feather name="lock" size={24} color="#d4a843" />
            </View>
            <Text style={styles.signupTitle}>Join the ASL Members Club</Text>
            <Text style={styles.signupSubtitle}>
              Sign up free to unlock all member offers and start saving on every order.
            </Text>
            <View style={styles.signupBenefits}>
              <Benefit text="10% welcome discount" />
              <Benefit text="Members-only promo codes" />
              <Benefit text="Early access to new arrivals" />
              <Benefit text="Free Lagos delivery offers" />
            </View>
            <Pressable
              style={styles.signupBtn}
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/auth/signup" as any);
              }}
            >
              <Text style={styles.signupBtnText}>Create Free Account</Text>
              <Feather name="arrow-right" size={16} color="#0d0b08" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/auth/login" as any)}
              style={{ paddingVertical: 8 }}
            >
              <Text style={styles.signupAlt}>
                Already a member? <Text style={{ color: "#d4a843", fontWeight: "700" }}>Sign in</Text>
              </Text>
            </Pressable>
          </View>
        )}

        {isLoggedIn && (
          <View style={styles.welcomeCard}>
            <View>
              <Text style={[styles.welcomeKicker, { color: colors.mutedForeground }]}>
                Welcome back
              </Text>
              <Text style={[styles.welcomeName, { color: colors.foreground }]}>
                {user.name}
              </Text>
            </View>
            <View style={styles.memberBadge}>
              <Feather name="award" size={14} color="#d4a843" />
              <Text style={styles.memberBadgeText}>Member</Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Available Codes
        </Text>

        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            unlocked={!offer.membersOnly || isLoggedIn}
            colors={colors}
            copiedCode={copiedCode}
            onCopy={copy}
            onSignup={() => router.push("/auth/signup" as any)}
          />
        ))}

        <View style={styles.footnote}>
          <Feather name="info" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footnoteText, { color: colors.mutedForeground }]}>
            Apply your code at checkout. One promo code per order. Drink responsibly.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Feather name="check" size={14} color="#d4a843" />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function OfferCard({
  offer,
  unlocked,
  colors,
  copiedCode,
  onCopy,
  onSignup,
}: {
  offer: Offer;
  unlocked: boolean;
  colors: ReturnType<typeof useColors>;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onSignup: () => void;
}) {
  const isCopied = copiedCode === offer.code;
  const discountText =
    offer.discountType === "percent"
      ? `${offer.discountValue}% OFF`
      : `₦${offer.discountValue.toLocaleString("en-NG")} OFF`;

  return (
    <View
      style={[
        styles.offerCard,
        {
          backgroundColor: colors.card,
          borderColor: unlocked ? "#d4a84355" : colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.offerHeader}>
        <View style={[styles.discountTag, { backgroundColor: unlocked ? "#d4a843" : colors.muted }]}>
          <Text
            style={[
              styles.discountTagText,
              { color: unlocked ? "#0d0b08" : colors.mutedForeground },
            ]}
          >
            {discountText}
          </Text>
        </View>
        {offer.badge && (
          <View
            style={[
              styles.smallBadge,
              { borderColor: unlocked ? "#d4a843" : colors.border },
            ]}
          >
            <Text
              style={[
                styles.smallBadgeText,
                { color: unlocked ? "#d4a843" : colors.mutedForeground },
              ]}
            >
              {offer.badge}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.offerTitle, { color: colors.foreground }]}>
        {offer.title}
      </Text>
      <Text style={[styles.offerDesc, { color: colors.mutedForeground }]}>
        {offer.description}
      </Text>

      {unlocked ? (
        <Pressable
          onPress={() => onCopy(offer.code)}
          style={[
            styles.codeBox,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <View>
            <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>
              Promo Code
            </Text>
            <Text style={[styles.codeText, { color: colors.foreground }]}>
              {offer.code}
            </Text>
          </View>
          <View style={styles.copyBtn}>
            <Feather
              name={isCopied ? "check" : "copy"}
              size={14}
              color={isCopied ? "#10b981" : "#d4a843"}
            />
            <Text
              style={[
                styles.copyBtnText,
                { color: isCopied ? "#10b981" : "#d4a843" },
              ]}
            >
              {isCopied ? "Copied!" : "Copy"}
            </Text>
          </View>
        </Pressable>
      ) : (
        <Pressable onPress={onSignup} style={styles.lockedBox}>
          <Feather name="lock" size={14} color="#9a8a6c" />
          <Text style={styles.lockedText}>Sign up to reveal code</Text>
          <Feather name="arrow-right" size={14} color="#d4a843" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#0d0b08",
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    gap: 6,
    backgroundColor: "#d4a843",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  badgePillText: {
    color: "#0d0b08",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#f5e6c8",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 40,
  },
  goldBar: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#d4a843",
    marginVertical: 12,
  },
  heroSubtitle: {
    color: "#9a8a6c",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 320,
  },
  signupCard: {
    backgroundColor: "#0d0b08",
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d4a84333",
  },
  signupIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#d4a84320",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  signupTitle: {
    color: "#f5e6c8",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  signupSubtitle: {
    color: "#9a8a6c",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
    maxWidth: 280,
  },
  signupBenefits: {
    width: "100%",
    gap: 8,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    color: "#c9b88e",
    fontSize: 13,
  },
  signupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#d4a843",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 100,
    width: "100%",
  },
  signupBtnText: {
    color: "#0d0b08",
    fontSize: 15,
    fontWeight: "800",
  },
  signupAlt: {
    color: "#9a8a6c",
    fontSize: 13,
    marginTop: 4,
  },
  welcomeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#d4a84314",
    borderWidth: 1,
    borderColor: "#d4a84333",
    marginBottom: 18,
  },
  welcomeKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  welcomeName: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d0b08",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  memberBadgeText: {
    color: "#d4a843",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  offerCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  offerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  discountTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  discountTagText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  smallBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    borderWidth: 1,
  },
  smallBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  offerTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  offerDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: "dashed",
    marginTop: 4,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  codeText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  lockedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: "dashed",
    borderColor: "#3a3022",
    backgroundColor: "#1a1610",
    marginTop: 4,
  },
  lockedText: {
    color: "#c9b88e",
    fontSize: 13,
    fontWeight: "600",
  },
  footnote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  footnoteText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
