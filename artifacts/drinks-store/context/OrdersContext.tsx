import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CartItem } from "./CartContext";

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  date: string;
  status: "processing" | "confirmed" | "shipped" | "delivered" | "cancelled";
  address: string;
  paymentMethod: string;
  name: string;
}

interface OrdersContextType {
  orders: Order[];
  addOrder: (
    items: CartItem[],
    total: number,
    details: { address: string; paymentMethod: string; name: string }
  ) => string;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  removeOrder: (id: string) => void;
}

const OrdersContext = createContext<OrdersContextType | null>(null);
const STORAGE_KEY = "drinks_store_orders";

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setOrders(JSON.parse(data));
        } catch {
          // ignore
        }
      }
      initialized.current = true;
    });
  }, []);

  useEffect(() => {
    if (initialized.current) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders]);

  const addOrder = useCallback(
    (
      items: CartItem[],
      total: number,
      details: { address: string; paymentMethod: string; name: string }
    ): string => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const newOrder: Order = {
        id,
        items,
        total,
        date: new Date().toISOString(),
        status: "processing",
        ...details,
      };
      setOrders((prev) => [newOrder, ...prev]);
      return id;
    },
    []
  );

  const updateOrderStatus = useCallback((id: string, status: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  }, []);

  const removeOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return (
    <OrdersContext.Provider value={{ orders, addOrder, updateOrderStatus, removeOrder }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders(): OrdersContextType {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
