import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (drinkId: string) => void;
  isFavorite: (drinkId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

const STORAGE_KEY = "drinks_store_favorites";

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setFavorites(JSON.parse(data));
        } catch {
          // ignore
        }
      }
      initialized.current = true;
    });
  }, []);

  useEffect(() => {
    if (initialized.current) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }
  }, [favorites]);

  const toggleFavorite = useCallback((drinkId: string) => {
    setFavorites((prev) =>
      prev.includes(drinkId) ? prev.filter((id) => id !== drinkId) : [...prev, drinkId]
    );
  }, []);

  const isFavorite = useCallback(
    (drinkId: string) => favorites.includes(drinkId),
    [favorites]
  );

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextType {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
