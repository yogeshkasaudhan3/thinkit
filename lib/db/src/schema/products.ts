import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable(
  "products",
  {
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
  },
  (t) => [
    // Indexes for common query patterns — also created via raw SQL (drizzle-kit push requires TTY)
    index("idx_products_enabled").on(t.enabled),
    index("idx_products_category_id").on(t.categoryId),
    index("idx_products_enabled_cat").on(t.enabled, t.categoryId),
    index("idx_products_subcategory").on(t.subcategory),
    index("idx_products_best_seller").on(t.isBestSeller),
    index("idx_products_dwarika").on(t.isDwarikaSpecial),
    index("idx_products_sku").on(t.sku),
    index("idx_products_barcode").on(t.barcode),
  ],
);

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
