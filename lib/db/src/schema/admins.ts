import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const adminEmailsTable = pgTable("admin_emails", {
  email: text("email").primaryKey(),
  addedBy: text("added_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminEmail = typeof adminEmailsTable.$inferSelect;
export type InsertAdminEmail = typeof adminEmailsTable.$inferInsert;
