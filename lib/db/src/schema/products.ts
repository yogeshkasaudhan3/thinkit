import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  categoryId: text("category_id").notNull(),
  subcategory: text("subcategory"),
  description: text("description"),
  mrp: integer("mrp").notNull(),
  price: integer("price").notNull(),
  weight: text("weight").notNull(),
  imageUrl: text("image_url"),
  sku: text("sku"),           // Item Code — primary inventory identifier (Vyapar Item Code)
  barcode: text("barcode"),   // Optional — future use (physical barcode scanner)
  stockQty: integer("stock_qty").notNull().default(0),
  inStock: boolean("in_stock").notNull().default(true),
  enabled: boolean("enabled").notNull().default(true),
  isBestSeller: boolean("is_best_seller").notNull().default(false),
  isDwarikaSpecial: boolean("is_dwarika_special").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
