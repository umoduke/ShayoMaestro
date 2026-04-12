import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogin = async () => {
    setLoading(true);
    setErrors({});
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({ general: result.error ?? "Login failed" });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/profile" as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Back Button */}
      <View style={[styles.navBar, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: bottomInset + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo area */}
        <View
          style={[styles.logoContainer, { backgroundColor: colors.primary + "18" }]}
        >
          <Feather name="droplet" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sign in to your Sip & Chill account
        </Text>

        <View style={{ width: "100%", gap: 14, marginTop: 32 }}>
          {errors.general && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: colors.destructive + "18",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorBannerText, { color: colors.destructive }]}>
                {errors.general}
              </Text>
            </View>
          )}

          <View>
            <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  color: colors.foreground,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
            <View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    color: colors.foreground,
                    paddingRight: 50,
                  },
                ]}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                style={styles.eyeBtn}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: loading ? 0.7 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={[styles.submitBtnText, { color: colors.primaryForeground }]}
              >
                Sign In
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/auth/signup" as any)}
          style={{ marginTop: 24 }}
        >
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            Don't have an account?{" "}
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Sign Up</Text>
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  errorBannerText: {
    fontSize: 14,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  submitBtn: {
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  switchText: {
    fontSize: 14,
  },
});
