import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  mobile: text("mobile").unique().notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // ── Manual admin password reset (temporary, until OTP-based reset exists) ──
  temporaryPasswordHash: text("temporary_password_hash"),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
  passwordResetRequestedAt: timestamp("password_reset_requested_at"),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
