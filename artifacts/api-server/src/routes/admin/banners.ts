import { Router, type IRouter } from "express";
import { db, bannersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";
import {
  CreateAdminBannerBody,
  UpdateAdminBannerBody,
  UpdateAdminBannerParams,
  DeleteAdminBannerParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── List banners ────────────────────────────────────────────────────────────
router.get("/admin/banners", requireAdmin, async (_req, res): Promise<void> => {
  const banners = await db
    .select()
    .from(bannersTable)
    .orderBy(bannersTable.sortOrder);
  res.json(banners.map(serializeBanner));
});

// ── Create banner ───────────────────────────────────────────────────────────
router.post("/admin/banners", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateAdminBannerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [banner] = await db.insert(bannersTable).values(body.data).returning();
  res.status(201).json(serializeBanner(banner));
});

// ── Update banner ───────────────────────────────────────────────────────────
router.patch("/admin/banners/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAdminBannerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateAdminBannerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [banner] = await db
    .update(bannersTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(bannersTable.id, params.data.id))
    .returning();

  if (!banner) {
    res.status(404).json({ error: "Banner not found" });
    return;
  }

  res.json(serializeBanner(banner));
});

// ── Delete banner ───────────────────────────────────────────────────────────
router.delete("/admin/banners/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteAdminBannerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [banner] = await db
    .delete(bannersTable)
    .where(eq(bannersTable.id, params.data.id))
    .returning();

  if (!banner) {
    res.status(404).json({ error: "Banner not found" });
    return;
  }

  res.sendStatus(204);
});

function serializeBanner(b: Record<string, unknown>) {
  return {
    ...b,
    createdAt:
      b.createdAt instanceof Date
        ? b.createdAt.toISOString()
        : String(b.createdAt ?? ""),
  };
}

export default router;
