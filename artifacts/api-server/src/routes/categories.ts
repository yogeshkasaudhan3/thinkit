/**
 * Public categories route — no authentication required.
 * Only active categories are exposed to the customer app.
 */
import { Router, type IRouter } from "express";
import { db, categoriesTable, subcategoryDefinitionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.status, "active"))
    .orderBy(categoriesTable.displayOrder);

  res.json(cats);
});

// ── Subcategory definitions for a category (master list) ─────────────────────
// Returns the canonical subcategory names from the subcategory_definitions table,
// sorted by display_order. Tabs appear even if no products are assigned yet.
router.get("/categories/:id/subcategories", async (req, res): Promise<void> => {
  const catId = parseInt(req.params.id, 10);
  if (isNaN(catId)) {
    res.status(400).json({ error: "Category id is required" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(subcategoryDefinitionsTable)
      .where(eq(subcategoryDefinitionsTable.categoryId, catId))
      .orderBy(asc(subcategoryDefinitionsTable.displayOrder));

    res.json(rows.map((r) => r.name));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

export default router;
