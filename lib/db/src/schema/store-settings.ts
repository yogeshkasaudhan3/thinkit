import { pgTable, integer, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";

export const storeSettingsTable = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  storeName: text("store_name").notNull().default("Dwarika Grocery Mart"),
  contactNumber: text("contact_number").notNull().default("+91 9876543210"),
  whatsappNumber: text("whatsapp_number").notNull().default("+91 9876543210"),
  supportEmail: text("support_email").notNull().default("support@thinkit.com"),
  storeAddress: text("store_address").notNull().default(""),
  businessHours: text("business_hours").notNull().default("8:00 AM - 10:00 PM"),
  deliveryRadiusKm: numeric("delivery_radius_km", { precision: 5, scale: 1 }).notNull().default("3.0"),
  freeDeliveryThreshold: integer("free_delivery_threshold").notNull().default(150),
  smallCartFeeThreshold: integer("small_cart_fee_threshold").notNull().default(100),
  smallCartFee: integer("small_cart_fee").notNull().default(20),
  deliveryFee: integer("delivery_fee").notNull().default(20),
  handlingFee: integer("handling_fee").notNull().default(5),
  minOrderEnabled: boolean("min_order_enabled").notNull().default(false),
  minOrderValue: integer("min_order_value").notNull().default(0),
  inventorySafetyBuffer: integer("inventory_safety_buffer").notNull().default(2),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type StoreSettings = typeof storeSettingsTable.$inferSelect;
