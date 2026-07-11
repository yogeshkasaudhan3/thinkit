/**
 * Admin CRUD for product variants (alternate pack sizes).
 *
 * A product with zero variant rows behaves exactly as it does today — this
 * table is strictly additive. Variants never replace the base product's own
 * price/weight/mrp fields; they represent extra pack-size options shown only
 * on the customer product detail page.
 */
import { Router, type IRouter } from "express";
import { db, productsTable, productVariantsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";
import {
  CreateProductVariantBody,
  UpdateProductVariantBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeVariant(v: Record<string, unknown>) {
  return {
    ...v,
    createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : String(v.createdAt ?? ""),
    updatedAt: v.updatedAt instanceof Date ? v.updatedAt.toISOString() : String(v.updatedAt ?? ""),
  };
}

function parseIntParam(raw: unknown): number | null {
  const n = parseInt(Array.isArray(raw) ? String(raw[0]) : String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

// ── GET /admin/products/:id/variants ────────────────────────────────────────
router.get("/admin/products/:id/variants", requireAdmin, async (req, res): Promise<void> => {
  const productId = parseIntParam(req.params.id);
  if (productId === null) { res.status(400).json({ error: "Invalid product id" }); return; }

  const variants = await db
    .select()
    .from(productVariantsTable)
    .where(eq(productVariantsTable.productId, productId))
    .orderBy(asc(productVariantsTable.sortOrder), asc(productVariantsTable.id));

  res.json(variants.map(serializeVariant));
});

// ── POST /admin/products/:id/variants ───────────────────────────────────────
router.post("/admin/products/:id/variants", requireAdmin, async (req, res): Promise<void> => {
  const productId = parseIntParam(req.params.id);
  if (productId === null) { res.status(400).json({ error: "Invalid product id" }); return; }

  const [product] = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.id, productId));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const body = CreateProductVariantBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [variant] = await db
    .insert(productVariantsTable)
    .values({ ...body.data, productId })
    .returning();

  res.status(201).json(serializeVariant(variant));
});

// ── PATCH /admin/products/variants/:variantId ───────────────────────────────
router.patch("/admin/products/variants/:variantId", requireAdmin, async (req, res): Promise<void> => {
  const variantId = parseIntParam(req.params.variantId);
  if (variantId === null) { res.status(400).json({ error: "Invalid variant id" }); return; }

  const body = UpdateProductVariantBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [variant] = await db
    .update(productVariantsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(productVariantsTable.id, variantId))
    .returning();

  if (!variant) { res.status(404).json({ error: "Variant not found" }); return; }
  res.json(serializeVariant(variant));
});

// ── DELETE /admin/products/variants/:variantId ──────────────────────────────
router.delete("/admin/products/variants/:variantId", requireAdmin, async (req, res): Promise<void> => {
  const variantId = parseIntParam(req.params.variantId);
  if (variantId === null) { res.status(400).json({ error: "Invalid variant id" }); return; }

  const [variant] = await db.delete(productVariantsTable).where(eq(productVariantsTable.id, variantId)).returning();
  if (!variant) { res.status(404).json({ error: "Variant not found" }); return; }
  res.sendStatus(204);
});

export default router;
