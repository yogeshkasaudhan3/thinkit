import { Router, type Request, type Response } from "express";
import { db, usersTable, addressesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// ─── Save profile + address (first-time setup or update) ─────────────────────
router.post("/profile", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { name, phone, houseNumber, area, landmark, pincode } = req.body as {
    name?: string;
    phone?: string;
    houseNumber?: string;
    area?: string;
    landmark?: string;
    pincode?: string;
  };

  if (!name?.trim() || !phone?.trim() || !houseNumber?.trim() || !area?.trim() || !pincode?.trim()) {
    res.status(400).json({ error: "name, phone, houseNumber, area, and pincode are required" });
    return;
  }

  if (!/^\d{6}$/.test(pincode.trim())) {
    res.status(400).json({ error: "Pincode must be 6 digits" });
    return;
  }

  const userId = (req.user as Express.User).id;

  try {
    await db
      .update(usersTable)
      .set({ name: name.trim(), phone: phone.trim(), profileComplete: true, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    // v1.0: one address per user — replace existing
    await db.delete(addressesTable).where(eq(addressesTable.userId, userId));
    await db.insert(addressesTable).values({
      userId,
      houseNumber: houseNumber.trim(),
      area: area.trim(),
      landmark: (landmark ?? "").trim(),
      pincode: pincode.trim(),
    });

    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const [address] = await db.select().from(addressesTable).where(eq(addressesTable.userId, userId));

    res.json({ success: true, user: updatedUser, address });
  } catch (err) {
    console.error("[profile] save error:", err);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// ─── Get profile + address ────────────────────────────────────────────────────
router.get("/profile", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = (req.user as Express.User).id;
  const [address] = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId));

  res.json({ user: req.user, address: address ?? null });
});

export default router;
