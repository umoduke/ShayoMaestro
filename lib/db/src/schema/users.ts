import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  date,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  birthday: date("birthday"),
  passwordHash: text("password_hash").notNull(),
  tier: text("tier").notNull().default("bronze"),
  points: integer("points").notNull().default(0),
  totalSpendKobo: integer("total_spend_kobo").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserRow = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
