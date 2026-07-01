import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
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

// ── List products with search ───────────────────────────────────────────────
router.get("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const inStockRaw = req.query.inStock;
  const enabledRaw = req.query.enabled;

  // Boolean coercion from query strings
  const inStock =
    inStockRaw === "true" ? true : inStockRaw === "false" ? false : undefined;
  const enabled =
    enabledRaw === "true" ? true : enabledRaw === "false" ? false : undefined;

  const conditions = [];
  if (q) {
    conditions.push(or(ilike(productsTable.name, `%${q}%`), ilike(productsTable.brand, `%${q}%`)));
  }
  if (category) conditions.push(eq(productsTable.categoryId, category));
  if (typeof inStock === "boolean") conditions.push(eq(productsTable.inStock, inStock));
  if (typeof enabled === "boolean") conditions.push(eq(productsTable.enabled, enabled));

  const products = await db
    .select()
    .from(productsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(productsTable.name)
    .limit(500);

  res.json(products.map(serializeProduct));
});

// ── Bulk import — must be before /:id ──────────────────────────────────────
router.post("/admin/products/bulk", requireAdmin, async (req, res): Promise<void> => {
  const body = BulkImportProductsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  let imported = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const p of body.data.products) {
    try {
      const [existing] = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(and(eq(productsTable.name, p.name), eq(productsTable.brand, p.brand)));

      if (existing) {
        await db
          .update(productsTable)
          .set({ ...p, updatedAt: new Date() })
          .where(eq(productsTable.id, existing.id));
        updated++;
      } else {
        await db.insert(productsTable).values(p);
        imported++;
      }
    } catch (err: unknown) {
      failed++;
      errors.push(`${p.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  res.json({ imported, updated, failed, errors });
});

// ── Create product ──────────────────────────────────────────────────────────
router.post("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateAdminProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [product] = await db.insert(productsTable).values(body.data).returning();
  res.status(201).json(serializeProduct(product));
});

// ── Get single product ──────────────────────────────────────────────────────
router.get("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAdminProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(serializeProduct(product));
});

// ── Update product ──────────────────────────────────────────────────────────
router.patch("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAdminProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateAdminProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(serializeProduct(product));
});

// ── Delete product ──────────────────────────────────────────────────────────
router.delete("/admin/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteAdminProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

// ── Toggle stock ────────────────────────────────────────────────────────────
router.patch("/admin/products/:id/stock", requireAdmin, async (req, res): Promise<void> => {
  const params = ToggleProductStockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ToggleProductStockBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set({ inStock: body.data.inStock, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(serializeProduct(product));
});

function serializeProduct(p: Record<string, unknown>) {
  return {
    ...p,
    createdAt:
      p.createdAt instanceof Date
        ? p.createdAt.toISOString()
        : String(p.createdAt ?? ""),
  };
}

export default router;
