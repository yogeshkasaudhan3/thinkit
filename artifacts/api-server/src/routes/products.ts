/**
 * Public product routes — no authentication required.
 * Only enabled products are exposed to the customer app.
 */
import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, and, or } from "drizzle-orm";

const router: IRouter = Router();

// ── List enabled products ────────────────────────────────────────────────────
router.get("/products", async (req, res): Promise<void> => {
  try {
    const { categoryId, search, isBestSeller, isDwarikaSpecial } = req.query;

    const conditions = [eq(productsTable.enabled, true)];

    if (categoryId && typeof categoryId === "string") {
      conditions.push(eq(productsTable.categoryId, categoryId));
    }
    if (search && typeof search === "string" && search.trim()) {
      conditions.push(
        or(
          ilike(productsTable.name, `%${search.trim()}%`),
          ilike(productsTable.brand, `%${search.trim()}%`),
        )!,
      );
    }
    if (isBestSeller === "true") {
      conditions.push(eq(productsTable.isBestSeller, true));
    }
    if (isDwarikaSpecial === "true") {
      conditions.push(eq(productsTable.isDwarikaSpecial, true));
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(productsTable.name)
      .limit(500);

    res.json(products.map(serializeProduct));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ── Get single enabled product ───────────────────────────────────────────────
router.get("/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  try {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, id), eq(productsTable.enabled, true)));

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json(serializeProduct(product));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

function serializeProduct(p: Record<string, unknown>) {
  return {
    ...p,
    // Numeric PK → string so the customer app can use it as React key / cart ID
    id: String(p.id),
    createdAt:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt ?? ""),
    updatedAt:
      p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt ?? ""),
  };
}

export default router;
