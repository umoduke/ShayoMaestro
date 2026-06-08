import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Drink, DRINKS } from "@/data/drinks";
import { api, type ApiProduct } from "@/lib/api";

interface ProductsContextType {
  products: Drink[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addProduct: (product: Omit<Drink, "id">) => Promise<string | null>;
  updateProduct: (
    id: string,
    updates: Partial<Omit<Drink, "id">>,
  ) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Drink | undefined;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

function apiToDrink(p: ApiProduct): Drink {
  return {
    id: p.id,
    name: p.name,
    shortName: p.shortName,
    category: p.category as Drink["category"],
    price: p.price,
    currency: p.currency || "₦",
    rating: p.rating,
    reviewCount: p.reviewCount,
    description: p.description,
    shortDescription: p.shortDescription,
    ingredients: p.ingredients ?? [],
    sizes: p.sizes ?? [],
    imageUri: p.imageUri,
    imageColor: p.imageColor,
    accentColor: p.accentColor,
    featured: p.featured,
    tags: p.tags ?? [],
    origin: p.origin ?? undefined,
    abv: p.abv ?? undefined,
    barcode: p.barcode ?? undefined,
  };
}

function drinkToInput(d: Partial<Drink> & { sizes: Drink["sizes"]; name: string }) {
  return {
    name: d.name,
    shortName: d.shortName ?? d.name,
    category: d.category ?? "all",
    price: d.price ?? d.sizes[0]?.price ?? 0,
    currency: d.currency ?? "₦",
    rating: d.rating ?? 0,
    reviewCount: d.reviewCount ?? 0,
    description: d.description ?? "",
    shortDescription: d.shortDescription ?? "",
    ingredients: d.ingredients ?? [],
    sizes: d.sizes,
    imageUri: d.imageUri ?? "",
    imageColor: d.imageColor ?? "#1a1a1a",
    accentColor: d.accentColor ?? "#ff6b35",
    featured: d.featured ?? false,
    tags: d.tags ?? [],
    origin: d.origin ?? null,
    abv: d.abv ?? null,
    barcode: d.barcode ?? null,
  };
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Drink[]>(DRINKS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const { products: rows } = await api.listProducts();
      if (rows.length > 0) {
        setProducts(rows.map(apiToDrink));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addProduct = useCallback(
    async (product: Omit<Drink, "id">): Promise<string | null> => {
      try {
        const { product: created } = await api.createProduct(
          drinkToInput(product as Drink),
        );
        const drink = apiToDrink(created);
        setProducts((prev) => [...prev, drink]);
        return drink.id;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add product");
        return null;
      }
    },
    [],
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Omit<Drink, "id">>) => {
      const current = products.find((p) => p.id === id);
      if (!current) return;
      const merged = { ...current, ...updates };
      try {
        const { product: updated } = await api.updateProduct(
          id,
          drinkToInput(merged),
        );
        const drink = apiToDrink(updated);
        setProducts((prev) => prev.map((p) => (p.id === id ? drink : p)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update product");
      }
    },
    [products],
  );

  const removeProduct = useCallback(async (id: string) => {
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete product");
    }
  }, []);

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  );

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        error,
        refresh,
        addProduct,
        updateProduct,
        removeProduct,
        getProductById,
      }}
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
