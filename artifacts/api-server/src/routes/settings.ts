/**
 * Public settings route — no authentication required.
 * Returns all store settings so the customer app can display
 * live contact info, delivery fees, etc.
 */
import { Router, type IRouter } from "express";
import { db, storeSettingsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  const [s] = await db.select().from(storeSettingsTable);
  if (!s) {
    // Row not yet inserted — return schema defaults so the app still works
    res.json({
      storeName: "Dwarika Grocery Mart",
      contactNumber: "+91 9876543210",
      whatsappNumber: "+91 9876543210",
      supportEmail: "support@thinkit.com",
      storeAddress: "",
      businessHours: "8:00 AM - 10:00 PM",
      deliveryRadiusKm: "3.0",
      freeDeliveryThreshold: 150,
      smallCartFeeThreshold: 100,
      smallCartFee: 20,
      deliveryFee: 20,
      handlingFee: 5,
      minOrderEnabled: false,
      minOrderValue: 0,
    });
    return;
  }
  res.json({
    ...s,
    updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
  });
});

export default router;
