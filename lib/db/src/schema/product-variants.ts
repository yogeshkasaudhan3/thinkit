import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

// Alternate pack sizes for a product (e.g. Chana 500g / 1kg alongside the
// product's own base weight/price). A product with zero rows here behaves
// exactly as it does today — variants are strictly additive/opt-in.
export const productVariantsTable = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .references(() => productsTable.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    weight: text("weight").notNull(),
    mrp: integer("mrp").notNull(),
    price: integer("price").notNull(),
    sku: text("sku"),
    barcode: text("barcode"),
    stockQty: integer("stock_qty").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("idx_product_variants_product_id").on(t.productId),
    index("idx_product_variants_active").on(t.active),
  ],
);

export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
