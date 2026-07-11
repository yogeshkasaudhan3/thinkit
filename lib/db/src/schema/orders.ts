import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  customerMobile: text("customer_mobile").notNull(),
  // address: { houseNumber, area, landmark, pincode }
  address: jsonb("address").notNull(),
  // items: [{ productId, name, brand, weight, qty, price }]
  items: jsonb("items").notNull(),
  subtotal: integer("subtotal").notNull(),
  smallCartFee: integer("small_cart_fee").notNull().default(0),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  handlingFee: integer("handling_fee").notNull().default(5),
  grandTotal: integer("grand_total").notNull(),
  paymentMethod: text("payment_method").notNull().default("cod"),
  orderNote: text("order_note"),
  // status: new | accepted | packing | out_for_delivery | delivered | cancelled
  status: text("status").notNull().default("new"),
  isNew: boolean("is_new").notNull().default(true),
  // Admin cancellation reason (set when admin cancels)
  cancellationReason: text("cancellation_reason"),
  // Payment collection (set when admin marks as delivered)
  // paymentStatus: paid | unpaid
  paymentStatus: text("payment_status"),
  // paymentCollectionMethod: cash | upi | mixed
  paymentCollectionMethod: text("payment_collection_method"),
  // For mixed payments: how much was cash vs UPI
  cashAmount: integer("cash_amount"),
  upiAmount: integer("upi_amount"),
  // Delivery partner assignment — set by admin once the order is handed off.
  // All nullable: unassigned orders simply omit these.
  deliveryPartnerName: text("delivery_partner_name"),
  deliveryPartnerMobile: text("delivery_partner_mobile"),
  deliveryPartnerPhotoUrl: text("delivery_partner_photo_url"),
  deliveryPartnerVehicleType: text("delivery_partner_vehicle_type"),
  deliveryPartnerVehicleNumber: text("delivery_partner_vehicle_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
