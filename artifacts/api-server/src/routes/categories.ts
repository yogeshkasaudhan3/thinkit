/**
 * Public categories route — no authentication required.
 * Only active categories are exposed to the customer app.
 */
import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.status, "active"))
    .orderBy(categoriesTable.displayOrder);

  res.json(cats);
});

// ── Distinct subcategory values for a category ───────────────────────────────
// Used by the customer app to build subcategory tab lists dynamically.
router.get("/categories/:id/subcategories", async (req, res): Promise<void> => {
  const id = String(req.params.id ?? "").trim();
  if (!id) {
    res.status(400).json({ error: "Category id is required" });
    return;
  }

  try {
    const rows = await db
      .selectDistinct({ subcategory: productsTable.subcategory })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.categoryId, id),
          isNotNull(productsTable.subcategory),
          eq(productsTable.enabled, true),
        ),
      )
      .orderBy(productsTable.subcategory);

    const subcategories = rows
      .map((r) => r.subcategory)
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    res.json(subcategories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

export default router;
