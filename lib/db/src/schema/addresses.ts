import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull(),
  houseNumber: text("house_number").notNull(),
  area: text("area").notNull(),
  landmark: text("landmark").default("").notNull(),
  pincode: text("pincode").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("addresses_user_id_unique").on(t.userId)]);

export type Address = typeof addressesTable.$inferSelect;
export type InsertAddress = typeof addressesTable.$inferInsert;
