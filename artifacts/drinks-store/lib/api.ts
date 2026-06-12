import { Platform } from "react-native";

function getBaseUrl(): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }
  return `https://${domain}`;
}

export const apiUrl = (path: string) =>
  `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

// Admin session token (set after admin login). Attached as a Bearer header so
// the server can authorize admin-only endpoints. Held in memory; AuthContext
// hydrates it from AsyncStorage on app start and clears it on logout.
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export interface ApiOrderItem {
  drinkId: string;
  drinkName: string;
  sizeLabel: string;
  sizePrice: number;
  quantity: number;
  imageUrl?: string;
}

export interface ApiOrder {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string | null;
  deliveryState: string | null;
  items: ApiOrderItem[];
  subtotalKobo: number;
  discountKobo: number;
  totalKobo: number;
  promoCode: string | null;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTransaction {
  id: string;
  orderId: string;
  reference: string;
  provider: string;
  amountKobo: number;
  currency: string;
  status: string;
  channel: string | null;
  gatewayResponse: string | null;
  paidAt: string | null;
  createdAt: string;
}

// Thrown when the network request itself fails (device offline, server
// unreachable) — distinct from a server error response so the UI can show an
// appropriate "you're offline" message.
export class NetworkError extends Error {
  constructor(message = "No internet connection. Please check your network and try again.") {
    super(message);
    this.name = "NetworkError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new NetworkError();
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryState?: string;
  items: ApiOrderItem[];
  subtotal: number;
  discount: number;
  promoCode?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface ApiProductSize {
  label: string;
  price: number;
}

export interface ApiProduct {
  id: string;
  name: string;
  shortName: string;
  category: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  description: string;
  shortDescription: string;
  ingredients: string[];
  sizes: ApiProductSize[];
  imageUri: string;
  imageColor: string;
  accentColor: string;
  featured: boolean;
  tags: string[];
  origin: string | null;
  abv: string | null;
  barcode: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<
  ApiProduct,
  "id" | "createdAt" | "updatedAt" | "sortOrder"
> & { sortOrder?: number };

export interface BarcodeLookupProduct {
  name: string;
  description: string | null;
  imageUri: string | null;
  origin: string | null;
  abv: string | null;
  category: string | null;
  tags: string[];
}

export const api = {
  adminLogin: (email: string, password: string) =>
    request<{ token: string; email: string; isAdmin: boolean }>(
      "/api/auth/admin-login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    ),
  listProducts: () => request<{ products: ApiProduct[] }>("/api/products"),
  lookupBarcode: (barcode: string) =>
    request<{
      found: boolean;
      source: "openfoodfacts" | null;
      product: BarcodeLookupProduct | null;
    }>(`/api/products/lookup/${encodeURIComponent(barcode)}`),
  createProduct: (input: ProductInput) =>
    request<{ product: ApiProduct }>("/api/products", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateProduct: (id: string, input: ProductInput) =>
    request<{ product: ApiProduct }>(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteProduct: (id: string) =>
    request<{ ok: true }>(`/api/products/${id}`, { method: "DELETE" }),
  createOrder: (input: CreateOrderInput) =>
    request<{ order: ApiOrder }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listOrders: () => request<{ orders: ApiOrder[] }>("/api/orders"),
  getOrder: (id: string) =>
    request<{ order: ApiOrder; transactions: ApiTransaction[] }>(
      `/api/orders/${id}`,
    ),
  updateOrderStatus: (id: string, fulfillmentStatus: string) =>
    request<{ order: ApiOrder }>(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ fulfillmentStatus }),
    }),
  initializePayment: (orderId: string, callbackUrl?: string) =>
    request<{ authorizationUrl: string; reference: string; orderId: string }>(
      "/api/payments/initialize",
      {
        method: "POST",
        body: JSON.stringify({ orderId, callbackUrl }),
      },
    ),
  verifyPayment: (reference: string) =>
    request<{
      status: "success" | "failed" | "pending";
      order: ApiOrder;
      paystack: {
        reference: string;
        amount: number;
        channel: string | null;
        paidAt: string | null;
        gatewayResponse: string | null;
      };
    }>(`/api/payments/verify/${encodeURIComponent(reference)}`),
  listTransactions: () =>
    request<{
      transactions: { transaction: ApiTransaction; order: ApiOrder | null }[];
    }>("/api/transactions"),
  listAdmins: () => request<{ admins: AdminEmail[] }>("/api/admins"),
  checkAdmin: (email: string) =>
    request<{ isAdmin: boolean }>(
      `/api/admins/check/${encodeURIComponent(email)}`,
    ),
  addAdmin: (email: string, addedBy?: string) =>
    request<{ admin: AdminEmail }>("/api/admins", {
      method: "POST",
      body: JSON.stringify({ email, addedBy }),
    }),
  removeAdmin: (email: string) =>
    request<{ ok: true }>(`/api/admins/${encodeURIComponent(email)}`, {
      method: "DELETE",
    }),
};

export interface AdminEmail {
  email: string;
  addedBy: string | null;
  createdAt: string;
}

export const formatKobo = (kobo: number) =>
  `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
