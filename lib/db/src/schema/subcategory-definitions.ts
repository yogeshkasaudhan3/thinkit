import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";

export const subcategoryDefinitionsTable = pgTable("subcategory_definitions", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type SubcategoryDefinition =
  typeof subcategoryDefinitionsTable.$inferSelect;
export type InsertSubcategoryDefinition =
  typeof subcategoryDefinitionsTable.$inferInsert;
