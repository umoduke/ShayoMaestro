import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItem {
  drinkId: string;
  drinkName: string;
  sizeLabel: string;
  sizePrice: number;
  quantity: number;
  imageColor: string;
  accentColor: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (drinkId: string, sizeLabel: string) => void;
  updateQuantity: (drinkId: string, sizeLabel: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "drinks_store_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setItems(JSON.parse(data));
        } catch {
          // ignore
        }
      }
      initialized.current = true;
    });
  }, []);

  useEffect(() => {
    if (initialized.current) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  const addItem = useCallback((newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.drinkId === newItem.drinkId && i.sizeLabel === newItem.sizeLabel
      );
      if (existing) {
        return prev.map((i) =>
          i.drinkId === newItem.drinkId && i.sizeLabel === newItem.sizeLabel
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((drinkId: string, sizeLabel: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.drinkId === drinkId && i.sizeLabel === sizeLabel))
    );
  }, []);

  const updateQuantity = useCallback(
    (drinkId: string, sizeLabel: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(drinkId, sizeLabel);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.drinkId === drinkId && i.sizeLabel === sizeLabel ? { ...i, quantity } : i
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.sizePrice * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
