import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Manual admin-driven password reset requests (temporary solution until
// OTP-based reset exists). One row per customer request; admin resolves it
// by generating a temporary password, marking it completed, or rejecting it.
export const passwordResetRequestsTable = pgTable("password_reset_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  // 'pending' | 'completed' | 'rejected'
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export type PasswordResetRequest = typeof passwordResetRequestsTable.$inferSelect;
export type InsertPasswordResetRequest = typeof passwordResetRequestsTable.$inferInsert;
