import { Stack } from "expo-router";
import React from "react";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="products" />
      <Stack.Screen name="product-form" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="transactions" />
    </Stack>
  );
}
