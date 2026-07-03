import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, and, or, sql, asc, desc } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";
import {
  CreateAdminProductBody,
  UpdateAdminProductBody,
  UpdateAdminProductParams,
  GetAdminProductParams,
  DeleteAdminProductParams,
  ToggleProductStockBody,
  ToggleProductStockParams,
  BulkImportProductsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Subcategory normaliser ───────────────────────────────────────────────────
// Trims whitespace and title-cases the value so "rice", "RICE", and " Rice "
// all resolve to "Rice". Returns null for blank/absent values.
export function normalizeSubcategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Title-case: capitalise first letter of each word, lowercase the rest.
  return trimmed.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// ── Shared WHERE clause builder ─────────────────────────────────────────────

function buildConditions(query: Record<string, unknown>, includeInStock = true) {
  const q           = typeof query.q           === "string" ? query.q           : undefined;
  const category    = typeof query.category    === "string" ? query.category    : undefined;
  const subcategory = typeof query.subcategory === "string" ? query.subcategory : undefined;
  const inStockRaw  = query.inStock;
  const enabledRaw  = query.enabled;

  const inStock = inStockRaw === "true" ? true : inStockRaw === "false" ? false : undefined;
  const enabled = enabledRaw === "true" ? true : enabledRaw === "false" ? false : undefined;

  const conds = [];
  if (q)    conds.push(or(
    ilike(productsTable.name,  `%${q}%`),
    ilike(productsTable.brand, `%${q}%`),
    ilike(productsTable.sku,   `%${q}%`),
  ));
  if (category)    conds.push(eq(productsTable.categoryId, category));
  if (subcategory) conds.push(eq(productsTable.subcategory, subcategory));
  if (includeInStock && typeof inStock === "boolean") conds.push(eq(productsTable.inStock, inStock));
  if (typeof enabled === "boolean")                   conds.push(eq(productsTable.enabled, enabled));

  return conds;
}

// ── GET /admin/products/stats ───────────────────────────────────────────────
// Returns total / inStock / outOfStock counts (ignores inStock query param so
// we always get both in- and out-of-stock totals regardless of stock filter).
router.get("/admin/products/stats", requireAdmin, async (req, res): Promise<void> => {
  const baseConds = buildConditions(req.query as Record<string, unknown>, /* includeInStock */ false);
  const baseWhere = baseConds.length ? and(...baseConds) : undefined;
  const inWhere   = baseConds.length ? and(...baseConds, eq(productsTable.inStock, true))  : eq(productsTable.inStock, true);
  const outWhere  = baseConds.length ? and(...baseConds, eq(productsTable.inStock, false)) : eq(productsTable.inStock, false);

  const [{ total }]       = await db.select({ total:    sql<number>`count(*)::int` }).from(productsTable).where(baseWhere);
  const [{ inStockCnt }]  = await db.select({ inStockCnt:  sql<number>`count(*)::int` }).from(productsTable).where(inWhere);
  const [{ outStockCnt }] = await db.select({ outStockCnt: sql<number>`count(*)::int` }).from(productsTable).where(outWhere);

  res.json({ total, inStock: inStockCnt, outOfStock: outStockCnt });
});

// ── GET /admin/products ─────────────────────────────────────────────────────
router.get("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const q = req.query as Record<string, unknown>;

  const conds   = buildConditions(q);
  const where   = conds.length ? and(...conds) : undefined;

  // Sort
  const sortParam = typeof q.sort === "string" ? q.sort : "name-asc";
  const orderByClause = ({
    "name-asc":   asc(productsTable.name),
    "name-desc":  desc(productsTable.name),
    "price-asc":  asc(productsTable.price),
    "price-desc": desc(productsTable.price),
    "recent":     desc(productsTable.createdAt),
  } as Record<string, ReturnType<typeof asc>>)[sortParam] ?? asc(productsTable.name);

  // Pagination
  const page     = Math.max(1, parseInt(typeof q.page     === "string" ? q.page     : "1",  10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(typeof q.pageSize === "string" ? q.pageSize : "50", 10) || 50));
  const offset   = (page - 1) * pageSize;

  const products = await db
    .select()
    .from(productsTable)
    .where(where)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  res.json(products.map(serializeProduct));
});

// ── POST /admin/products/bulk — must be before /:id ─────────────────────────
router.post("/admin/products/bulk", requireAdmin, async (req, res): Promise<void> => {
  const body = BulkImportProductsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  let imported = 0, updated = 0, failed = 0;
  const errors: string[] = [];

  for (const p of body.data.products) {
    try {
      const [existing] = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(and(eq(productsTable.name, p.name), eq(productsTable.brand, p.brand)));

      const normalizedP = { ...p, subcategory: normalizeSubcategory(p.subcategory as string | null | undefined) };
      if (existing) {
        await db.update(productsTable).set({ ...normalizedP, updatedAt: new Date() }).where(eq(productsTable.id, existing.id));
        updated++;
      } else {
        await db.insert(productsTable).values(normalizedP);
        imported++;
      }
    } catch (err: unknown) {
      failed++;
      errors.push(`${p.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  res.json({ imported, updated, failed, errors });
});

// ── POST /admin/products ─────────────────────────────────────────────────────
router.post("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateAdminProductBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const values = { ...body.data, subcategory: normalizeSubcategory(body.data.subcategory) };
  const [product] = await db.insert(productsTable).values(values).returning();
  res.status(201).json(serializeProduct(product));
});

// ── GET /admin/products/:id ──────────────────────────────────────────────────
router.get("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAdminProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(serializeProduct(product));
});

// ── PATCH /admin/products/:id ────────────────────────────────────────────────
router.patch("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAdminProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateAdminProductBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const patch = { ...body.data, updatedAt: new Date() };
  if ("subcategory" in patch) {
    const norm = normalizeSubcategory(patch.subcategory as string | null | undefined);
    patch.subcategory = norm ?? undefined;
  }
  const [product] = await db
    .update(productsTable)
    .set(patch)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(serializeProduct(product));
});

// ── DELETE /admin/products/:id ───────────────────────────────────────────────
router.delete("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteAdminProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.sendStatus(204);
});

// ── PATCH /admin/products/:id/stock ─────────────────────────────────────────
router.patch("/admin/products/:id/stock", requireAdmin, async (req, res): Promise<void> => {
  const params = ToggleProductStockParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = ToggleProductStockBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [product] = await db
    .update(productsTable)
    .set({ inStock: body.data.inStock, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(serializeProduct(product));
});

// ── Serializer ───────────────────────────────────────────────────────────────
function serializeProduct(p: Record<string, unknown>) {
  return {
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt ?? ""),
  };
}

export default router;
