import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export type SyncError = { row: number; name: string; reason: string };

export const inventorySyncLogsTable = pgTable("inventory_sync_logs", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  adminUser: text("admin_user").notNull(),
  productsUpdated: integer("products_updated").notNull().default(0),
  newProducts: integer("new_products").notNull().default(0),
  outOfStockCount: integer("out_of_stock_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  errors: jsonb("errors").$type<SyncError[]>().notNull().default([]),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventorySyncLog = typeof inventorySyncLogsTable.$inferSelect;
