/**
 * Public product routes — no authentication required.
 * Only enabled products are exposed to the customer app.
 *
 * All list responses are paginated:
 *   { items: Product[], total: number, hasMore: boolean }
 *
 * Query params (GET /products):
 *   limit        — page size (default 20, max 50)
 *   offset       — start index  (default 0)
 *   categoryId   — filter by category
 *   subcategory  — filter by subcategory name (exact match)
 *   search       — ILIKE filter on name + brand (uses pg_trgm index)
 *   isBestSeller — "true" to filter
 *   isDwarikaSpecial — "true" to filter
 */
import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, and, or, count, sql } from "drizzle-orm";

const router: IRouter = Router();

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

function parseLimit(v: unknown): number {
  const n = parseInt(String(v ?? ""), 10);
  return isNaN(n) ? DEFAULT_LIMIT : Math.min(MAX_LIMIT, Math.max(1, n));
}

function parseOffset(v: unknown): number {
  const n = parseInt(String(v ?? ""), 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}

// ── List enabled products (paginated) ────────────────────────────────────────
router.get("/products", async (req, res): Promise<void> => {
  try {
    const {
      categoryId,
      subcategory,
      search,
      isBestSeller,
      isDwarikaSpecial,
      limit: limitQ,
      offset: offsetQ,
    } = req.query;

    const limit = parseLimit(limitQ);
    const offset = parseOffset(offsetQ);

    const conditions = [eq(productsTable.enabled, true)];

    if (categoryId && typeof categoryId === "string") {
      conditions.push(eq(productsTable.categoryId, categoryId));
    }
    if (subcategory && typeof subcategory === "string" && subcategory.trim()) {
      conditions.push(eq(productsTable.subcategory, subcategory.trim()));
    }
    if (search && typeof search === "string" && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(productsTable.name, term),
          ilike(productsTable.brand, term),
        )!,
      );
    }
    if (isBestSeller === "true") {
      conditions.push(eq(productsTable.isBestSeller, true));
    }
    if (isDwarikaSpecial === "true") {
      conditions.push(eq(productsTable.isDwarikaSpecial, true));
    }

    const where = and(...conditions);

    // Run count + page fetch in parallel
    const [countRow, rows] = await Promise.all([
      db.select({ n: count() }).from(productsTable).where(where),
      db
        .select()
        .from(productsTable)
        .where(where)
        .orderBy(productsTable.name)
        .limit(limit)
        .offset(offset),
    ]);

    const total = Number(countRow[0]?.n ?? 0);

    res.json({
      items: rows.map(serializeProduct),
      total,
      hasMore: offset + rows.length < total,
    });
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
