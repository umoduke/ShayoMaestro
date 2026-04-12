import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Drink, DRINKS } from "@/data/drinks";

interface ProductsContextType {
  products: Drink[];
  addProduct: (product: Omit<Drink, "id">) => string;
  updateProduct: (id: string, updates: Partial<Omit<Drink, "id">>) => void;
  removeProduct: (id: string) => void;
  getProductById: (id: string) => Drink | undefined;
  resetToDefaults: () => void;
}

const ProductsContext = createContext<ProductsContextType | null>(null);
const STORAGE_KEY = "asl_products_v1";

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Drink[]>(DRINKS);
  const initialized = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProducts(parsed);
          }
        } catch {
          // ignore
        }
      }
      initialized.current = true;
    });
  }, []);

  useEffect(() => {
    if (initialized.current) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  }, [products]);

  const addProduct = useCallback((product: Omit<Drink, "id">): string => {
    const id = "p_" + Date.now().toString() + Math.random().toString(36).substr(2, 4);
    const newProduct: Drink = { ...product, id };
    setProducts((prev) => [...prev, newProduct]);
    return id;
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Omit<Drink, "id">>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  const resetToDefaults = useCallback(() => {
    setProducts(DRINKS);
  }, []);

  return (
    <ProductsContext.Provider
      value={{ products, addProduct, updateProduct, removeProduct, getProductById, resetToDefaults }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): ProductsContextType {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
}
