import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useOrders } from "@/context/OrdersContext";
import { useNotifications } from "@/context/NotificationsContext";
import { tierMeta } from "@/lib/loyalty";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { computePreview } from "@/lib/pricing";

const PAYMENT_METHODS = ["Pay with Paystack", "Pay on Delivery"];
const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

const PICKUP_LOCATION = {
  address: "1 Imam Ligali Street, Ogudu Ori-oke, Lagos",
  hours: "Monday – Saturday, 9am – 6pm",
};

type FulfillmentType = "delivery" | "pickup";

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, total, clearCart } = useCart();
  const { user, refreshUser } = useAuth();
  const { addOrder } = useOrders();
  const { addNotification } = useNotifications();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountKobo: number;
    stackable: boolean;
    label: string;
  } | null>(null);

  const subtotalKobo = Math.round(total * 100);
  // Advisory preview only — the server recomputes all pricing authoritatively
  // when the order is created (see lib/pricing.ts).
  const preview = computePreview({
    subtotalKobo,
    tier: user?.tier,
    fulfillmentType,
    promo: appliedPromo
      ? {
          code: appliedPromo.code,
          discountKobo: appliedPromo.discountKobo,
          stackable: appliedPromo.stackable,
        }
      : null,
  });
  const discount = preview.promoDiscountKobo / 100;
  const memberDiscount = preview.memberDiscountKobo / 100;
  const deliveryFee = preview.deliveryFeeKobo / 100;
  const finalTotal = preview.totalKobo / 100;

  const handleApplyPromo = async () => {
    setPromoError("");
    const code = promoInput.trim();
    if (!code) return;
    setPromoChecking(true);
    try {
      const result = await api.validatePromo(
        code,
        subtotalKobo,
        email.trim() || undefined,
      );
      if (!result.valid || !result.code) {
        setPromoError(result.message ?? "Invalid code");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      setAppliedPromo({
        code: result.code.code,
        discountKobo: result.discountKobo,
        stackable: result.code.stackable,
        label: result.code.description ?? "Promo applied",
      });
      setPromoInput("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setPromoError("Couldn't check that code. Try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPromoChecking(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError("");
    Haptics.selectionAsync();
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()))
      e.email = "Valid email is required";
    if (fulfillmentType === "delivery" && !address.trim())
      e.address = "Delivery address is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    return e;
  };

  const handlePlaceOrder = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSubmitting(true);
    setPaymentError("");
    const isPickup = fulfillmentType === "pickup";
    const orderAddress = isPickup ? PICKUP_LOCATION.address : address.trim();
    try {
      const { order, promo } = await api.createOrder({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        deliveryAddress: orderAddress,
        fulfillmentType,
        items: items.map((item) => ({
          drinkId: String(item.drinkId),
          drinkName: item.drinkName,
          sizeLabel: item.sizeLabel,
          sizePrice: item.sizePrice,
          quantity: item.quantity,
        })),
        promoCode: appliedPromo?.code,
        paymentMethod: paymentMethod === "Pay with Paystack" ? "paystack" : "cod",
      });

      // The server is authoritative for pricing — use its computed total and
      // tell the customer if their promo couldn't be applied.
      const serverTotal = order.totalKobo / 100;
      if (appliedPromo && !promo.applied) {
        setAppliedPromo(null);
        if (promo.message) setPaymentNote(promo.message);
      }
      const promoSuffix =
        appliedPromo && promo.applied ? ` · Promo: ${appliedPromo.code}` : "";
      const localId = addOrder(items, serverTotal, {
        name,
        address: isPickup
          ? `Pickup · ${PICKUP_LOCATION.address} · ${phone}${promoSuffix}`
          : `${orderAddress} · ${phone}${promoSuffix}`,
        paymentMethod,
      });

      if (paymentMethod === "Pay with Paystack") {
        const init = await api.initializePayment(order.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const result = await WebBrowser.openBrowserAsync(init.authorizationUrl);
        // After the browser closes, verify the transaction
        try {
          const verify = await api.verifyPayment(init.reference);
          if (verify.status === "success") {
            setPaymentNote("Payment successful — your order is confirmed.");
            // Server awards loyalty points/tier on payment confirm — pull the
            // updated balance so the profile/members screens reflect it.
            void refreshUser();
            addNotification({
              kind: "order",
              title: "Order confirmed",
              body: `Your payment was successful — order ${order.reference} is confirmed. We'll keep you posted on delivery.`,
            });
            if (verify.loyalty && verify.loyalty.pointsEarned > 0) {
              addNotification({
                kind: "points",
                title: "Points earned",
                body: `You earned ${verify.loyalty.pointsEarned.toLocaleString(
                  "en-NG",
                )} points on this order. Keep shopping to climb the tiers.`,
              });
            }
            if (verify.loyalty?.upgradedTo) {
              addNotification({
                kind: "tier",
                title: "Tier upgraded",
                body: `Congratulations — you've reached ${
                  tierMeta(verify.loyalty.upgradedTo).label
                }! Enjoy your new member benefits.`,
              });
            }
          } else if (verify.status === "failed") {
            setPaymentNote("Payment was not completed. You can retry later.");
          } else {
            setPaymentNote(
              "Payment is still pending verification. We'll confirm shortly.",
            );
          }
        } catch {
          setPaymentNote(
            "We couldn't verify the payment automatically. Check your order soon.",
          );
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPaymentNote(
          isPickup
            ? `Order received. Pay on arrival at ${PICKUP_LOCATION.address} (${PICKUP_LOCATION.hours}).`
            : "Order received. We'll contact you via WhatsApp to arrange delivery & payment.",
        );
        addNotification({
          kind: "order",
          title: "Order received",
          body: isPickup
            ? `Order ${order.reference} is reserved for pickup at ${PICKUP_LOCATION.address}. Pay on arrival.`
            : `Order ${order.reference} received. We'll contact you on WhatsApp to arrange delivery & payment.`,
        });
      }

      setOrderId(localId);
      clearCart();
      setPlaced(true);
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Could not place order. Try again.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  if (placed) {
    return (
      <View
        style={[
          styles.success,
          {
            backgroundColor: colors.background,
            paddingTop: topInset,
            paddingBottom: bottomInset,
          },
        ]}
      >
        <View style={[styles.successIcon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="check-circle" size={56} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Order Placed!
        </Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Your order #{orderId.slice(-6).toUpperCase()} has been received.
          {paymentNote ? `\n${paymentNote}` : ""}
        </Text>
        <Pressable
          onPress={() =>
            router.replace({ pathname: "/order/[id]", params: { id: orderId } } as any)
          }
          style={[
            styles.trackBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <Feather name="navigation" size={18} color={colors.primaryForeground} />
          <Text style={[styles.trackBtnText, { color: colors.primaryForeground }]}>
            Track Your Order
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push("/(tabs)" as any)}>
          <Text style={[styles.continueShopping, { color: colors.primary }]}>
            Continue Shopping
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 120 }}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        {/* Order Summary */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Order Summary
        </Text>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          {items.map((item, idx) => (
            <View key={`${item.drinkId}-${item.sizeLabel}-${idx}`} style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: item.accentColor }]} />
              <Text
                style={[styles.summaryName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {item.drinkName}
              </Text>
              <Text style={[styles.summaryQty, { color: colors.mutedForeground }]}>
                x{item.quantity}
              </Text>
              <Text style={[styles.summaryPrice, { color: colors.foreground }]}>
                {formatNaira(item.sizePrice * item.quantity)}
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.subRow}>
            <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.subValue, { color: colors.foreground }]}>
              {formatNaira(total)}
            </Text>
          </View>
          {memberDiscount > 0 && (
            <View style={styles.subRow}>
              <Text style={[styles.subLabel, { color: "#10b981" }]}>
                Member discount (5%)
              </Text>
              <Text style={[styles.subValue, { color: "#10b981" }]}>
                -{formatNaira(memberDiscount)}
              </Text>
            </View>
          )}
          {appliedPromo && discount > 0 && (
            <View style={styles.subRow}>
              <Text style={[styles.subLabel, { color: "#10b981" }]}>
                Discount ({appliedPromo.code})
              </Text>
              <Text style={[styles.subValue, { color: "#10b981" }]}>
                -{formatNaira(discount)}
              </Text>
            </View>
          )}
          {fulfillmentType === "delivery" && (
            <View style={styles.subRow}>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
                Delivery fee
              </Text>
              {deliveryFee > 0 ? (
                <Text style={[styles.subValue, { color: colors.foreground }]}>
                  {formatNaira(deliveryFee)}
                </Text>
              ) : (
                <Text style={[styles.subValue, { color: "#10b981" }]}>Free</Text>
              )}
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              {formatNaira(finalTotal)}
            </Text>
          </View>
        </View>

        {/* Promo Code */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
          Promo Code
        </Text>
        {appliedPromo ? (
          <View
            style={[
              styles.appliedPromo,
              { backgroundColor: "#10b98114", borderColor: "#10b98155" },
            ]}
          >
            <Feather name="check-circle" size={18} color="#10b981" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.appliedPromoCode, { color: colors.foreground }]}>
                {appliedPromo.code}
              </Text>
              <Text style={[styles.appliedPromoLabel, { color: colors.mutedForeground }]}>
                {appliedPromo.label} · You save {formatNaira(discount)}
              </Text>
            </View>
            <Pressable onPress={handleRemovePromo} style={styles.removePromoBtn}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.promoRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: colors.secondary,
                    borderColor: promoError ? colors.destructive : colors.border,
                    borderRadius: colors.radius,
                    color: colors.foreground,
                    letterSpacing: 1,
                  },
                ]}
                placeholder="Enter code"
                placeholderTextColor={colors.mutedForeground}
                value={promoInput}
                onChangeText={(t) => {
                  setPromoInput(t.toUpperCase());
                  if (promoError) setPromoError("");
                }}
                autoCapitalize="characters"
              />
              <Pressable
                onPress={handleApplyPromo}
                disabled={!promoInput.trim() || promoChecking}
                style={[
                  styles.applyBtn,
                  {
                    backgroundColor: promoInput.trim() ? colors.primary : colors.muted,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                {promoChecking ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text
                    style={[
                      styles.applyBtnText,
                      {
                        color: promoInput.trim()
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    Apply
                  </Text>
                )}
              </Pressable>
            </View>
            {promoError ? (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {promoError}
              </Text>
            ) : (
              <Pressable
                onPress={() => router.push("/offers" as any)}
                style={styles.viewOffersLink}
              >
                <Feather name="gift" size={13} color={colors.primary} />
                <Text style={[styles.viewOffersText, { color: colors.primary }]}>
                  View available offers
                </Text>
              </Pressable>
            )}
          </>
        )}

        {/* Delivery Method */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
          Delivery Method
        </Text>
        <View style={styles.methodRow}>
          {(["delivery", "pickup"] as FulfillmentType[]).map((type) => {
            const active = fulfillmentType === type;
            return (
              <Pressable
                key={type}
                onPress={() => {
                  setFulfillmentType(type);
                  if (type === "pickup" && errors.address)
                    setErrors((e) => ({ ...e, address: "" }));
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.methodOption,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary + "12" : colors.card,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather
                  name={type === "delivery" ? "truck" : "home"}
                  size={20}
                  color={active ? colors.primary : colors.foreground}
                />
                <Text
                  style={[
                    styles.methodText,
                    {
                      color: active ? colors.primary : colors.foreground,
                      fontWeight: active ? "700" : "500",
                    },
                  ]}
                >
                  {type === "delivery" ? "Delivery" : "Pickup"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Customer Details */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
          {fulfillmentType === "pickup" ? "Your Details" : "Delivery Details"}
        </Text>
        <View style={{ gap: 14 }}>
          <View>
            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondary,
                  borderColor: errors.name ? colors.destructive : colors.border,
                  borderRadius: colors.radius,
                  color: colors.foreground,
                },
              ]}
              placeholder="Your full name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (errors.name) setErrors((e) => ({ ...e, name: "" }));
              }}
            />
            {errors.name && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {errors.name}
              </Text>
            )}
          </View>

          <View>
            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondary,
                  borderColor: errors.email ? colors.destructive : colors.border,
                  borderRadius: colors.radius,
                  color: colors.foreground,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((e) => ({ ...e, email: "" }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {errors.email}
              </Text>
            )}
          </View>

          <View>
            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Phone Number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondary,
                  borderColor: errors.phone ? colors.destructive : colors.border,
                  borderRadius: colors.radius,
                  color: colors.foreground,
                },
              ]}
              placeholder="+234 800 000 0000"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                if (errors.phone) setErrors((e) => ({ ...e, phone: "" }));
              }}
              keyboardType="phone-pad"
            />
            {errors.phone && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {errors.phone}
              </Text>
            )}
          </View>

          {fulfillmentType === "delivery" ? (
            <View>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Delivery Address</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.addressInput,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: errors.address ? colors.destructive : colors.border,
                    borderRadius: colors.radius,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Street address, City, State"
                placeholderTextColor={colors.mutedForeground}
                value={address}
                onChangeText={(t) => {
                  setAddress(t);
                  if (errors.address) setErrors((e) => ({ ...e, address: "" }));
                }}
                multiline
                numberOfLines={2}
              />
              {errors.address && (
                <Text style={[styles.error, { color: colors.destructive }]}>
                  {errors.address}
                </Text>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.pickupCard,
                {
                  backgroundColor: colors.primary + "0d",
                  borderColor: colors.primary + "44",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={[styles.pickupIcon, { backgroundColor: colors.primary + "1f" }]}>
                <Feather name="map-pin" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickupTitle, { color: colors.foreground }]}>
                  Pickup Location
                </Text>
                <Text style={[styles.pickupAddress, { color: colors.foreground }]}>
                  {PICKUP_LOCATION.address}
                </Text>
                <View style={styles.pickupHoursRow}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.pickupHours, { color: colors.mutedForeground }]}>
                    {PICKUP_LOCATION.hours}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Payment Method */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
          Payment Method
        </Text>
        <View style={{ gap: 10 }}>
          {PAYMENT_METHODS.map((method) => (
            <Pressable
              key={method}
              onPress={() => {
                setPaymentMethod(method);
                Haptics.selectionAsync();
              }}
              style={[
                styles.paymentOption,
                {
                  borderColor:
                    paymentMethod === method ? colors.primary : colors.border,
                  backgroundColor:
                    paymentMethod === method ? colors.primary + "12" : colors.card,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather
                name={
                  method === "Card Payment"
                    ? "credit-card"
                    : method === "Bank Transfer"
                    ? "layers"
                    : method === "USSD"
                    ? "smartphone"
                    : "package"
                }
                size={20}
                color={paymentMethod === method ? colors.primary : colors.foreground}
              />
              <Text
                style={[
                  styles.paymentText,
                  {
                    color: paymentMethod === method ? colors.primary : colors.foreground,
                    fontWeight: paymentMethod === method ? "700" : "500",
                  },
                ]}
              >
                {method === "Pay on Delivery" && fulfillmentType === "pickup"
                  ? "Pay on Arrival"
                  : method}
              </Text>
              {paymentMethod === method && (
                <Feather name="check-circle" size={18} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </KeyboardAwareScrollView>

      {/* Place Order */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomInset + 16,
          },
        ]}
      >
        {paymentError ? (
          <Text
            style={{
              color: colors.destructive,
              fontSize: 13,
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            {paymentError}
          </Text>
        ) : null}
        <Pressable
          onPress={handlePlaceOrder}
          disabled={submitting}
          style={[
            styles.placeOrderBtn,
            {
              backgroundColor: submitting ? colors.muted : colors.primary,
              borderRadius: colors.radius,
              opacity: submitting ? 0.8 : 1,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Feather
              name={paymentMethod === "Pay with Paystack" ? "credit-card" : "check"}
              size={20}
              color={colors.primaryForeground}
            />
          )}
          <Text style={[styles.placeOrderText, { color: colors.primaryForeground }]}>
            {submitting
              ? "Processing..."
              : paymentMethod === "Pay with Paystack"
              ? `Pay ${formatNaira(finalTotal)}`
              : `Place Order · ${formatNaira(finalTotal)}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  success: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  successSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    width: "100%",
    justifyContent: "center",
    marginTop: 8,
  },
  trackBtnText: { fontSize: 16, fontWeight: "700" },
  continueShopping: { fontSize: 15, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  summaryCard: { borderWidth: 1, padding: 14, gap: 10 },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryName: { flex: 1, fontSize: 13 },
  summaryQty: { fontSize: 13 },
  summaryPrice: { fontSize: 13, fontWeight: "600" },
  divider: { height: 1 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 15, fontWeight: "600" },
  totalAmount: { fontSize: 20, fontWeight: "800" },
  subRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subLabel: { fontSize: 13 },
  subValue: { fontSize: 13, fontWeight: "600" },
  promoRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  applyBtn: {
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  appliedPromo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
  },
  appliedPromoCode: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  appliedPromoLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  removePromoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  viewOffersLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  viewOffersText: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: { padding: 14, fontSize: 15, borderWidth: 1 },
  addressInput: { minHeight: 80, textAlignVertical: "top" },
  error: { fontSize: 12, marginTop: 4 },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
  },
  paymentText: { flex: 1, fontSize: 15 },
  methodRow: { flexDirection: "row", gap: 10 },
  methodOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  methodText: { fontSize: 15 },
  pickupCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  pickupIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pickupAddress: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  pickupHoursRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  pickupHours: { fontSize: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
  placeOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  placeOrderText: { fontSize: 17, fontWeight: "700" },
});
