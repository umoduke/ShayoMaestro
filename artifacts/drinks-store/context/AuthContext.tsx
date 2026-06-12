import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "@/lib/api";

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
const TOKEN_KEY = "drinks_store_admin_token";

const ADMIN_EMAIL = "admin@asl.com";

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
    // Hydrate the admin session token first so authed requests work on launch.
    AsyncStorage.getItem(TOKEN_KEY).then((token) => {
      if (token) setAuthToken(token);
    });
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

      // The super-admin (store owner) authenticates against the server, which
      // verifies the password and returns a session token. The password is no
      // longer stored in the app — the server is the single source of truth.
      if (normalizedEmail === ADMIN_EMAIL) {
        try {
          const { token } = await api.adminLogin(normalizedEmail, password);
          setAuthToken(token);
          await AsyncStorage.setItem(TOKEN_KEY, token);
          const adminUser: User = {
            id: "admin",
            name: "Admin",
            email: normalizedEmail,
            isAdmin: true,
          };
          setUser(adminUser);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(adminUser));
          return { success: true };
        } catch (err) {
          return {
            success: false,
            error:
              err instanceof Error && err.message
                ? err.message
                : "Invalid admin credentials",
          };
        }
      }

      const isAdmin = await isAllowlistedAdmin(normalizedEmail);
      const newUser: User = {
        id: Date.now().toString(),
        name: normalizedEmail.split("@")[0],
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
    setAuthToken(null);
    AsyncStorage.multiRemove([USER_KEY, TOKEN_KEY]);
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
