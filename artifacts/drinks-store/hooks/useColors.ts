import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useSettings } from "@/context/SettingsContext";

/**
 * Resolves the active color scheme ("light" | "dark") from the user's
 * Appearance preference, falling back to the device setting for "system".
 * Use this anywhere you previously reached for `useColorScheme()` directly so
 * the explicit Light/Dark choice is honored consistently across the app.
 */
export function useEffectiveScheme(): "light" | "dark" {
  const systemScheme = useColorScheme();
  const { themeMode } = useSettings();
  return themeMode === "system" ? systemScheme ?? "light" : themeMode;
}

export function useColors() {
  const effectiveScheme = useEffectiveScheme();
  const palette = effectiveScheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
