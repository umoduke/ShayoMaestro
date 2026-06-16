import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

// Promo code engine (spec section 3). All money in kobo (₦1 = 100 kobo).
//
// `type` is descriptive metadata for how the code is meant to be distributed
// (single_use personalised, referral, milestone reward, win-back, seasonal
// campaign). The redemption RULES are enforced by the columns below, not by the
// type — so the engine treats every code uniformly.
//
// `discountType`:
//   - "percent" → `discountValue` is a whole-number percentage (e.g. 10 = 10%).
//   - "flat"    → `discountValue` is a kobo amount taken off the subtotal.
export const promoCodesTable = pgTable("promo_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("seasonal"),
  discountType: text("discount_type").notNull().default("percent"),
  discountValue: integer("discount_value").notNull(),
  minOrderKobo: integer("min_order_kobo").notNull().default(0),
  // Caps the discount on a percentage code so a large order can't run away
  // (null = uncapped). Ignored for flat codes.
  maxDiscountKobo: integer("max_discount_kobo"),
  expiresAt: timestamp("expires_at"),
  // null = unlimited total redemptions across all customers.
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").notNull().default(0),
  // How many times a single customer (by user id or email) may redeem.
  perUserLimit: integer("per_user_limit").notNull().default(1),
  // null/empty = all tiers eligible; otherwise a subset of "bronze|silver|gold".
  eligibleTiers: text("eligible_tiers").array(),
  // Whether this code may stack ON TOP of member (tier) pricing. When false the
  // order takes whichever of (member discount, promo discount) is larger.
  stackable: boolean("stackable").notNull().default(false),
  active: boolean("active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One row per successful redemption. Drives per-user-limit enforcement and
// admin analytics. `email` is captured so guest redemptions are still bounded.
export const promoRedemptionsTable = pgTable("promo_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  promoCodeId: uuid("promo_code_id")
    .notNull()
    .references(() => promoCodesTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  orderId: uuid("order_id").references(() => ordersTable.id, {
    onDelete: "set null",
  }),
  email: text("email"),
  discountKobo: integer("discount_kobo").notNull(),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
});

export type PromoCode = typeof promoCodesTable.$inferSelect;
export type InsertPromoCode = typeof promoCodesTable.$inferInsert;
export type PromoRedemption = typeof promoRedemptionsTable.$inferSelect;
export type InsertPromoRedemption = typeof promoRedemptionsTable.$inferInsert;
