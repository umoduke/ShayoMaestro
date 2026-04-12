import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  id: string;
  name: string;
  email: string;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then((data) => {
      if (data) {
        try {
          setUser(JSON.parse(data));
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
      const newUser: User = {
        id: Date.now().toString(),
        name: email.split("@")[0],
        email,
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
      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
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
