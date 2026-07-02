import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";

const router: IRouter = Router();

// ── List all categories ──────────────────────────────────────────────────────
router.get("/admin/categories", requireAdmin, async (_req, res): Promise<void> => {
  const cats = await db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.displayOrder);
  res.json(cats.map(serialize));
});

// ── Create category ──────────────────────────────────────────────────────────
router.post("/admin/categories", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [cat] = await db
    .insert(categoriesTable)
    .values({
      name,
      emoji: typeof body.emoji === "string" ? body.emoji || null : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl || null : null,
      status: body.status === "inactive" ? "inactive" : "active",
      displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : 0,
    })
    .returning();

  res.status(201).json(serialize(cat));
});

// ── Update category ──────────────────────────────────────────────────────────
router.patch("/admin/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if ("emoji" in body) {
    updates.emoji = typeof body.emoji === "string" ? body.emoji || null : null;
  }
  if ("imageUrl" in body) {
    updates.imageUrl = typeof body.imageUrl === "string" ? body.imageUrl || null : null;
  }
  if (body.status === "active" || body.status === "inactive") {
    updates.status = body.status;
  }
  if (typeof body.displayOrder === "number") {
    updates.displayOrder = body.displayOrder;
  }

  const [cat] = await db
    .update(categoriesTable)
    .set(updates)
    .where(eq(categoriesTable.id, id))
    .returning();

  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(serialize(cat));
});

// ── Delete category ──────────────────────────────────────────────────────────
router.delete("/admin/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [cat] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .returning();

  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.sendStatus(204);
});

function serialize(c: Record<string, unknown>) {
  return {
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt ?? ""),
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt ?? ""),
  };
}

export default router;
