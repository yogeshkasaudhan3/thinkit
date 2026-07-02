import { Router, type IRouter } from "express";
import { db, storeSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";

const router: IRouter = Router();

// ── GET /admin/settings ───────────────────────────────────────────────────────
router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  // Ensure the singleton row exists (self-healing for fresh environments)
  await db.insert(storeSettingsTable).values({ id: 1 }).onConflictDoNothing();
  const [s] = await db.select().from(storeSettingsTable);
  if (!s) {
    res.status(500).json({ error: "Failed to initialise settings" });
    return;
  }
  res.json({
    ...s,
    updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
  });
});

// ── PATCH /admin/settings ─────────────────────────────────────────────────────
router.patch("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  const str = (k: string) => {
    if (typeof body[k] === "string") updates[k] = body[k];
  };
  const int = (k: string) => {
    const v = Number(body[k]);
    if (!isNaN(v) && Number.isInteger(v) && v >= 0) updates[k] = v;
  };
  const num = (k: string) => {
    const v = parseFloat(String(body[k]));
    if (!isNaN(v) && v >= 0) updates[k] = String(v.toFixed(1));
  };
  const bool = (k: string) => {
    if (typeof body[k] === "boolean") updates[k] = body[k];
  };

  str("storeName");
  str("contactNumber");
  str("whatsappNumber");
  str("supportEmail");
  str("storeAddress");
  str("businessHours");
  num("deliveryRadiusKm");
  int("freeDeliveryThreshold");
  int("smallCartFeeThreshold");
  int("smallCartFee");
  int("deliveryFee");
  int("handlingFee");
  bool("minOrderEnabled");
  int("minOrderValue");
  int("inventorySafetyBuffer");

  // Ensure the singleton row exists before updating (self-healing)
  await db.insert(storeSettingsTable).values({ id: 1 }).onConflictDoNothing();

  const [s] = await db
    .update(storeSettingsTable)
    .set(updates)
    .where(eq(storeSettingsTable.id, 1))
    .returning();

  if (!s) {
    res.status(500).json({ error: "Failed to update settings" });
    return;
  }

  res.json({
    ...s,
    updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
  });
});

export default router;
