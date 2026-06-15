import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AgeGate } from "@/components/AgeGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  AgeVerificationProvider,
  useAgeVerification,
} from "@/context/AgeVerificationContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { OffersProvider } from "@/context/OffersContext";
import { OrdersProvider } from "@/context/OrdersContext";
import { ProductsProvider } from "@/context/ProductsContext";
import { SettingsProvider } from "@/context/SettingsContext";

SplashScreen.preventAutoHideAsync();

const USE_NATIVE_DRIVER = Platform.OS !== "web";
const queryClient = new QueryClient();
const ASL_LOGO = require("@/assets/images/asl-logo.webp");

function AppSplash({ onDone }: { onDone: () => void }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.delay(900),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[styles.splash, { opacity: screenOpacity }]}>
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: "center",
          gap: 0,
        }}
      >
        <Image
          source={ASL_LOGO}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <View style={styles.goldBar} />
      </Animated.View>
    </Animated.View>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="drink/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="offers" options={{ headerShown: false }} />
      <Stack.Screen name="membership" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

function GatedApp() {
  const { isLoading, isVerified } = useAgeVerification();
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: "#0d0b08" }} />;
  }
  if (!isVerified) {
    return <AgeGate />;
  }
  return <RootLayoutNav />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AgeVerificationProvider>
                <AuthProvider>
                  <NotificationsProvider>
                  <ProductsProvider>
                    <OffersProvider>
                    <CartProvider>
                      <FavoritesProvider>
                        <OrdersProvider>
                          <View style={{ flex: 1 }}>
                            <GatedApp />
                            {!splashDone && (
                              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                                <AppSplash onDone={() => setSplashDone(true)} />
                              </View>
                            )}
                          </View>
                        </OrdersProvider>
                      </FavoritesProvider>
                    </CartProvider>
                    </OffersProvider>
                  </ProductsProvider>
                  </NotificationsProvider>
                </AuthProvider>
              </AgeVerificationProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0d0b08",
    alignItems: "center",
    justifyContent: "center",
  },
  splashLogo: {
    width: 260,
    height: 260,
  },
  goldBar: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#d4a843",
    marginTop: 20,
  },
});
