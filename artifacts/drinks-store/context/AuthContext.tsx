import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken, type ApiUser } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  phone?: string | null;
  birthday?: string | null;
  tier?: string;
  points?: number;
  totalSpendKobo?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_KEY = "drinks_store_user";
const TOKEN_KEY = "drinks_store_admin_token";

const ADMIN_EMAIL = "admin@asl.com";

function toUser(u: ApiUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    isAdmin: u.isAdmin,
    phone: u.phone,
    birthday: u.birthday,
    tier: u.tier,
    points: u.points,
    totalSpendKobo: u.totalSpendKobo,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persist = useCallback(async (u: User | null, token?: string | null) => {
    if (token !== undefined) {
      setAuthToken(token);
      if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
      else await AsyncStorage.removeItem(TOKEN_KEY);
    }
    setUser(u);
    if (u) await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    else await AsyncStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    // Hydrate the session token + cached user, then re-sync from the server so
    // tier/points/admin status reflect the latest server state on each launch.
    (async () => {
      try {
        const [token, data] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (token) setAuthToken(token);
        if (data) {
          try {
            setUser(JSON.parse(data) as User);
          } catch {
            // ignore corrupt cache
          }
        }
        // The super-admin session has no user record to re-sync against.
        if (token && data) {
          let cached: User | null = null;
          try {
            cached = JSON.parse(data) as User;
          } catch {
            cached = null;
          }
          if (cached && cached.email !== ADMIN_EMAIL) {
            try {
              const { user: fresh } = await api.me();
              await persist(toUser(fresh));
            } catch {
              // Network/expired-token: keep cached user; a failed call here
              // shouldn't lock a returning customer out of the app.
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [persist]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (!email || !password) return { success: false, error: "Please fill in all fields" };
      if (!email.includes("@")) return { success: false, error: "Invalid email address" };
      if (password.length < 6) return { success: false, error: "Password must be at least 6 characters" };

      const normalizedEmail = email.toLowerCase().trim();

      // The super-admin (store owner) authenticates against the dedicated admin
      // endpoint (password held server-side) and receives an admin token.
      if (normalizedEmail === ADMIN_EMAIL) {
        try {
          const { token } = await api.adminLogin(normalizedEmail, password);
          await persist(
            { id: "admin", name: "Admin", email: normalizedEmail, isAdmin: true },
            token,
          );
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

      try {
        const { token, user: u } = await api.login(normalizedEmail, password);
        await persist(toUser(u), token);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error && err.message ? err.message : "Login failed",
        };
      }
    },
    [persist],
  );

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!name || !email || !password)
        return { success: false, error: "Please fill in all fields" };
      if (!email.includes("@")) return { success: false, error: "Invalid email address" };
      if (password.length < 6)
        return { success: false, error: "Password must be at least 6 characters" };

      const normalizedEmail = email.toLowerCase().trim();
      try {
        const { token, user: u } = await api.signup(name.trim(), normalizedEmail, password);
        await persist(toUser(u), token);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error && err.message ? err.message : "Could not create account",
        };
      }
    },
    [persist],
  );

  const refreshUser = useCallback(async () => {
    if (!user || user.email === ADMIN_EMAIL) return;
    try {
      const { user: fresh } = await api.me();
      await persist(toUser(fresh));
    } catch {
      // ignore — keep current user on failure
    }
  }, [user, persist]);

  const logout = useCallback(() => {
    setUser(null);
    setAuthToken(null);
    AsyncStorage.multiRemove([USER_KEY, TOKEN_KEY]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
