import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("active"), // active | inactive
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Category = typeof categoriesTable.$inferSelect;
export type InsertCategory = typeof categoriesTable.$inferInsert;
