import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ordersTable = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  userId: uuid("user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryCity: text("delivery_city"),
  deliveryState: text("delivery_state"),
  items: jsonb("items").notNull().$type<OrderLineItem[]>(),
  subtotalKobo: integer("subtotal_kobo").notNull(),
  discountKobo: integer("discount_kobo").notNull().default(0),
  totalKobo: integer("total_kobo").notNull(),
  promoCode: text("promo_code"),
  fulfillmentType: text("fulfillment_type").notNull().default("delivery"),
  paymentMethod: text("payment_method").notNull().default("paystack"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  fulfillmentStatus: text("fulfillment_status").notNull().default("processing"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  reference: text("reference").notNull().unique(),
  provider: text("provider").notNull().default("paystack"),
  amountKobo: integer("amount_kobo").notNull(),
  currency: text("currency").notNull().default("NGN"),
  status: text("status").notNull().default("pending"),
  channel: text("channel"),
  gatewayResponse: text("gateway_response"),
  paidAt: timestamp("paid_at"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Normalized line items (alongside the denormalized `items` JSONB on orders).
// The JSONB copy keeps existing reads cheap; this table is the relational
// source of truth for analytics and reporting.
export const orderItemsTable = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  drinkName: text("drink_name").notNull(),
  sizeLabel: text("size_label").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceKobo: integer("unit_price_kobo").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export interface OrderLineItem {
  drinkId: string;
  drinkName: string;
  sizeLabel: string;
  sizePrice: number;
  quantity: number;
  imageUrl?: string;
}

export type Order = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type InsertOrderItem = typeof orderItemsTable.$inferInsert;
