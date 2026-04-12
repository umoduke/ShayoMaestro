import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
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
import { useColors } from "@/hooks/useColors";

const PAYMENT_METHODS = ["Credit Card", "Debit Card", "PayPal", "Apple Pay"];

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();

  const [name, setName] = useState(user?.name ?? "");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!address.trim()) e.address = "Address is required";
    return e;
  };

  const handlePlaceOrder = () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = addOrder(items, total, { name, address, paymentMethod });
    setOrderId(id);
    clearCart();
    setPlaced(true);
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
        <View style={[styles.successIcon, { backgroundColor: colors.success + "22" }]}>
          <Feather name="check-circle" size={56} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Order Placed!
        </Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Your order #{orderId.slice(-6).toUpperCase()} has been received
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/orders" as any)}
          style={[
            styles.trackBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <Feather name="package" size={18} color={colors.primaryForeground} />
          <Text style={[styles.trackBtnText, { color: colors.primaryForeground }]}>
            Track Order
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
      {/* Header */}
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
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          {items.map((item, idx) => (
            <View key={`${item.drinkId}-${item.sizeLabel}-${idx}`} style={styles.summaryItem}>
              <View
                style={[styles.summaryDot, { backgroundColor: item.accentColor }]}
              />
              <Text style={[styles.summaryName, { color: colors.foreground }]} numberOfLines={1}>
                {item.drinkName}
              </Text>
              <Text style={[styles.summaryQty, { color: colors.mutedForeground }]}>
                x{item.quantity}
              </Text>
              <Text style={[styles.summaryPrice, { color: colors.foreground }]}>
                ${(item.sizePrice * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              ${total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Delivery Details */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
          Delivery Details
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
              placeholder="Your name"
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
              placeholder="Street, City, State, ZIP"
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
                    paymentMethod === method
                      ? colors.primary + "12"
                      : colors.card,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather
                name={
                  method === "Credit Card" || method === "Debit Card"
                    ? "credit-card"
                    : method === "PayPal"
                    ? "dollar-sign"
                    : "smartphone"
                }
                size={20}
                color={
                  paymentMethod === method ? colors.primary : colors.foreground
                }
              />
              <Text
                style={[
                  styles.paymentText,
                  {
                    color:
                      paymentMethod === method ? colors.primary : colors.foreground,
                    fontWeight: paymentMethod === method ? "700" : "500",
                  },
                ]}
              >
                {method}
              </Text>
              {paymentMethod === method && (
                <Feather name="check-circle" size={18} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </KeyboardAwareScrollView>

      {/* Place Order Button */}
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
        <Pressable
          onPress={handlePlaceOrder}
          style={[
            styles.placeOrderBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <Feather name="check" size={20} color={colors.primaryForeground} />
          <Text style={[styles.placeOrderText, { color: colors.primaryForeground }]}>
            Place Order — ${total.toFixed(2)}
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
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  successSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
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
  trackBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  continueShopping: {
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  summaryCard: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryName: {
    flex: 1,
    fontSize: 14,
  },
  summaryQty: {
    fontSize: 13,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
  },
  paymentText: {
    flex: 1,
    fontSize: 15,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  placeOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  placeOrderText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
