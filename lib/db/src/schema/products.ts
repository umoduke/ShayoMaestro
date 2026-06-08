import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  real,
  boolean,
} from "drizzle-orm/pg-core";

export interface ProductSize {
  label: string;
  price: number;
}

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  currency: text("currency").notNull().default("\u20A6"),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  description: text("description").notNull().default(""),
  shortDescription: text("short_description").notNull().default(""),
  ingredients: jsonb("ingredients").notNull().$type<string[]>().default([]),
  sizes: jsonb("sizes").notNull().$type<ProductSize[]>(),
  imageUri: text("image_uri").notNull().default(""),
  imageColor: text("image_color").notNull().default("#1a1a1a"),
  accentColor: text("accent_color").notNull().default("#ff6b35"),
  featured: boolean("featured").notNull().default(false),
  tags: jsonb("tags").notNull().$type<string[]>().default([]),
  origin: text("origin"),
  abv: text("abv"),
  barcode: text("barcode"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
