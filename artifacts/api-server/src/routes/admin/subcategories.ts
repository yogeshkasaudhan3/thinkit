/**
 * Admin CRUD routes for subcategory definitions.
 * Subcategory definitions are the master list for each category —
 * separate from the `subcategory` text field on products.
 */
import { Router, type IRouter } from "express";
import { db, subcategoryDefinitionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

// ── List subcategories for a category ────────────────────────────────────────
router.get(
  "/admin/categories/:catId/subcategories",
  requireAdmin,
  async (req, res): Promise<void> => {
    const catId = parseId(req.params.catId);
    if (isNaN(catId)) {
      res.status(400).json({ error: "Invalid category id" });
      return;
    }
    const rows = await db
      .select()
      .from(subcategoryDefinitionsTable)
      .where(eq(subcategoryDefinitionsTable.categoryId, catId))
      .orderBy(asc(subcategoryDefinitionsTable.displayOrder));
    res.json(rows.map(serialize));
  },
);

// ── Create subcategory ────────────────────────────────────────────────────────
router.post(
  "/admin/categories/:catId/subcategories",
  requireAdmin,
  async (req, res): Promise<void> => {
    const catId = parseId(req.params.catId);
    if (isNaN(catId)) {
      res.status(400).json({ error: "Invalid category id" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const displayOrder =
      typeof body.displayOrder === "number" ? body.displayOrder : 0;

    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl || null : null;

    const [row] = await db
      .insert(subcategoryDefinitionsTable)
      .values({ categoryId: catId, name, displayOrder, imageUrl })
      .returning();

    res.status(201).json(serialize(row));
  },
);

// ── Update subcategory ────────────────────────────────────────────────────────
router.patch(
  "/admin/subcategories/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.displayOrder === "number") {
      updates.displayOrder = body.displayOrder;
    }
    if ("imageUrl" in body) {
      updates.imageUrl =
        typeof body.imageUrl === "string" ? body.imageUrl || null : null;
    }

    const [row] = await db
      .update(subcategoryDefinitionsTable)
      .set(updates)
      .where(eq(subcategoryDefinitionsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Subcategory not found" });
      return;
    }
    res.json(serialize(row));
  },
);

// ── Delete subcategory ────────────────────────────────────────────────────────
router.delete(
  "/admin/subcategories/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [row] = await db
      .delete(subcategoryDefinitionsTable)
      .where(eq(subcategoryDefinitionsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Subcategory not found" });
      return;
    }
    res.sendStatus(204);
  },
);

function serialize(r: Record<string, unknown>) {
  return {
    ...r,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt ?? ""),
    updatedAt:
      r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : String(r.updatedAt ?? ""),
  };
}

export default router;
