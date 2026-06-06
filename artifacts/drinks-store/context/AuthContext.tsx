import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_KEY = "drinks_store_user";

const ADMIN_EMAIL = "admin@asl.com";
const ADMIN_PASSWORD = "ASLadmin2026";

// Checks the server-side admin allowlist. Returns false on any network error
// so a backend hiccup never blocks a normal user from logging in.
async function isAllowlistedAdmin(email: string): Promise<boolean> {
  try {
    const { isAdmin } = await api.checkAdmin(email);
    return isAdmin;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then(async (data) => {
      if (data) {
        try {
          const stored: User = JSON.parse(data);
          setUser(stored);
          // Re-sync admin status against the server allowlist so promotions
          // or removals take effect the next time the app is opened.
          if (stored.email !== ADMIN_EMAIL) {
            const isAdmin = await isAllowlistedAdmin(stored.email);
            if (isAdmin !== stored.isAdmin) {
              const updated = { ...stored, isAdmin };
              setUser(updated);
              await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
            }
          }
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (!email || !password) return { success: false, error: "Please fill in all fields" };
      if (!email.includes("@")) return { success: false, error: "Invalid email address" };
      if (password.length < 6) return { success: false, error: "Password must be at least 6 characters" };

      const normalizedEmail = email.toLowerCase().trim();
      const isSuperAdmin =
        normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD;
      // The super-admin email is ONLY granted admin via its password. Never let
      // the allowlist check elevate it (the server reports it as admin by
      // identity), otherwise any password would unlock admin access.
      const isAdmin =
        isSuperAdmin ||
        (normalizedEmail !== ADMIN_EMAIL &&
          (await isAllowlistedAdmin(normalizedEmail)));

      const newUser: User = {
        id: isSuperAdmin ? "admin" : Date.now().toString(),
        name: isSuperAdmin ? "Admin" : normalizedEmail.split("@")[0],
        email: normalizedEmail,
        isAdmin,
      };
      setUser(newUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
      return { success: true };
    },
    []
  );

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!name || !email || !password)
        return { success: false, error: "Please fill in all fields" };
      if (!email.includes("@")) return { success: false, error: "Invalid email address" };
      if (password.length < 6)
        return { success: false, error: "Password must be at least 6 characters" };
      const normalizedEmail = email.toLowerCase().trim();
      const newUser: User = {
        id: Date.now().toString(),
        name,
        email: normalizedEmail,
        isAdmin:
          normalizedEmail !== ADMIN_EMAIL &&
          (await isAllowlistedAdmin(normalizedEmail)),
      };
      setUser(newUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    AsyncStorage.removeItem(USER_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
