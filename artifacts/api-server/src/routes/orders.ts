/**
 * Customer-facing order routes.
 *
 * POST   /orders          — place a new order (requireAuth)
 * GET    /orders          — list current user's orders (requireAuth)
 * PATCH  /orders/:id/cancel — cancel own order (requireAuth; only new/accepted)
 *
 * ─── Price integrity ────────────────────────────────────────────────────────
 * POST /orders fetches authoritative prices from the products table and
 * recomputes all totals server-side. Client-supplied prices are ignored.
 * ───────────────────────────────────────────────────────────────────────────
 */
import { Router, type IRouter } from "express";
import { db, ordersTable, addressesTable, productsTable, productVariantsTable, storeSettingsTable } from "@workspace/db";
import { eq, inArray, sql, and } from "drizzle-orm";
import { requireAuth, type AuthUser } from "../middleware/requireAuth";
import { orderEvents } from "../lib/orderEvents";

const router: IRouter = Router();

// ── Settings cache (1-min TTL, avoids a DB hit on every order) ───────────────
interface FeeSettings {
  handlingFee: number;
  smallCartFee: number;
  smallCartFeeThreshold: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderEnabled: boolean;
  minOrderValue: number;
}

const FEE_DEFAULTS: FeeSettings = {
  handlingFee: 5,
  smallCartFee: 20,
  smallCartFeeThreshold: 100,
  deliveryFee: 20,
  freeDeliveryThreshold: 150,
  minOrderEnabled: false,
  minOrderValue: 0,
};

let settingsCache: FeeSettings | null = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL_MS = 60_000;

async function getSettings(): Promise<FeeSettings> {
  if (settingsCache && Date.now() - settingsCacheTime < SETTINGS_CACHE_TTL_MS) {
    return settingsCache;
  }
  const [s] = await db
    .select({
      handlingFee: storeSettingsTable.handlingFee,
      smallCartFee: storeSettingsTable.smallCartFee,
      smallCartFeeThreshold: storeSettingsTable.smallCartFeeThreshold,
      deliveryFee: storeSettingsTable.deliveryFee,
      freeDeliveryThreshold: storeSettingsTable.freeDeliveryThreshold,
      minOrderEnabled: storeSettingsTable.minOrderEnabled,
      minOrderValue: storeSettingsTable.minOrderValue,
    })
    .from(storeSettingsTable);
  settingsCache = s ?? FEE_DEFAULTS;
  settingsCacheTime = Date.now();
  return settingsCache;
}

function computeSmallCartFee(subtotal: number, s: FeeSettings): number {
  return subtotal > 0 && subtotal < s.smallCartFeeThreshold ? s.smallCartFee : 0;
}

function computeDeliveryFee(subtotal: number, s: FeeSettings): number {
  return subtotal >= s.freeDeliveryThreshold ? 0 : s.deliveryFee;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawItem {
  productId: string;
  variantId?: string;
  qty: number;
}

interface CreateOrderBody {
  items: RawItem[];
  paymentMethod?: string;
  orderNote?: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

function isValidBody(b: unknown): b is CreateOrderBody {
  if (!b || typeof b !== "object") return false;
  const body = b as Record<string, unknown>;

  if (!Array.isArray(body.items) || body.items.length === 0) return false;

  for (const item of body.items as unknown[]) {
    if (!item || typeof item !== "object") return false;
    const it = item as Record<string, unknown>;
    if (
      typeof it.productId !== "string" ||
      !it.productId.trim() ||
      typeof it.qty !== "number" ||
      !Number.isInteger(it.qty) ||
      it.qty < 1 ||
      it.qty > 100
    ) return false;

    if (
      it.variantId !== undefined &&
      (typeof it.variantId !== "string" || !it.variantId.trim())
    ) return false;
  }

  if (
    body.paymentMethod !== undefined &&
    body.paymentMethod !== "cod" &&
    body.paymentMethod !== "upi"
  ) return false;

  if (
    body.orderNote !== undefined &&
    (typeof body.orderNote !== "string" || body.orderNote.length > 500)
  ) return false;

  return true;
}

// ── Order number generation ───────────────────────────────────────────────────

function makeOrderNumber(): string {
  const now = new Date();
  const date =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DWK-${date}-${rand}`;
}

function serializeOrder(o: Record<string, unknown>) {
  return {
    ...o,
    createdAt:
      o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt ?? ""),
    updatedAt:
      o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt ?? ""),
  };
}

// ── GET /orders — customer's own order history ────────────────────────────────

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const user = res.locals.user as AuthUser;

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerId, user.id))
    .orderBy(sql`${ordersTable.createdAt} DESC`)
    .limit(200);

  res.json(orders.map(serializeOrder));
});

// ── PATCH /orders/:id/cancel — customer cancels own order ─────────────────────
// Atomic: the WHERE clause enforces ownership + cancellable-status in a single
// UPDATE, eliminating the read-then-write race if an admin changes status between
// a separate read and write.

router.patch("/orders/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const user = res.locals.user as AuthUser;

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  // Single atomic UPDATE — only succeeds if the order belongs to this customer
  // AND is still in a cancellable state (new or accepted).
  const [updated] = await db
    .update(ordersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      sql`${ordersTable.id} = ${id}
          AND ${ordersTable.customerId} = ${user.id}
          AND ${ordersTable.status} IN ('new', 'accepted')`
    )
    .returning();

  if (!updated) {
    // No row matched — determine why so we can return a meaningful error.
    const [existing] = await db
      .select({ id: ordersTable.id, customerId: ordersTable.customerId, status: ordersTable.status })
      .from(ordersTable)
      .where(eq(ordersTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (existing.customerId !== user.id) {
      res.status(403).json({ error: "Not your order" });
      return;
    }
    // Order exists and belongs to user but wasn't in a cancellable state
    res.status(409).json({
      error: "Order cannot be cancelled at this stage. Please contact support.",
    });
    return;
  }

  res.json(serializeOrder(updated as unknown as Record<string, unknown>));
});

// ── POST /orders — place a new order ─────────────────────────────────────────

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const user = res.locals.user as AuthUser;

  if (!isValidBody(req.body)) {
    res.status(400).json({ error: "Invalid order payload" });
    return;
  }

  const { items: rawItems, paymentMethod = "cod", orderNote } = req.body;

  // ── 1. Fetch authoritative product data from DB ───────────────────────────
  const productIds = rawItems.map((i) => parseInt(i.productId, 10)).filter((n) => !isNaN(n));
  if (productIds.length !== rawItems.length) {
    res.status(400).json({ error: "Invalid product ID in items" });
    return;
  }

  const dbProducts = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      brand: productsTable.brand,
      weight: productsTable.weight,
      price: productsTable.price,
      inStock: productsTable.inStock,
      enabled: productsTable.enabled,
    })
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  // Fetch authoritative variant data (alternate pack sizes) for any items that
  // reference one. A variant belongs to exactly one product — the (productId,
  // variantId) pair is validated below so a customer can't buy a variant that
  // doesn't belong to the product they claim to be ordering.
  const variantIds = rawItems
    .map((i) => (i.variantId ? parseInt(i.variantId, 10) : null))
    .filter((n): n is number => n !== null && !isNaN(n));

  const dbVariants = variantIds.length
    ? await db
        .select({
          id: productVariantsTable.id,
          productId: productVariantsTable.productId,
          name: productVariantsTable.name,
          weight: productVariantsTable.weight,
          price: productVariantsTable.price,
          stockQty: productVariantsTable.stockQty,
          active: productVariantsTable.active,
        })
        .from(productVariantsTable)
        .where(inArray(productVariantsTable.id, variantIds))
    : [];
  const variantMap = new Map(dbVariants.map((v) => [v.id, v]));

  for (const raw of rawItems) {
    const id = parseInt(raw.productId, 10);
    const product = productMap.get(id);
    if (!product) {
      res.status(400).json({ error: `Product ${raw.productId} not found` });
      return;
    }
    if (!product.enabled) {
      res.status(400).json({ error: `Product "${product.name}" is not available` });
      return;
    }

    if (raw.variantId) {
      const variantId = parseInt(raw.variantId, 10);
      const variant = variantMap.get(variantId);
      if (!variant || variant.productId !== id) {
        res.status(400).json({ error: `Selected pack size for "${product.name}" is no longer available` });
        return;
      }
      if (!variant.active) {
        res.status(400).json({ error: `"${product.name}" (${variant.weight}) is no longer available` });
        return;
      }
      if (variant.stockQty < raw.qty) {
        res.status(400).json({ error: `"${product.name}" (${variant.weight}) is out of stock` });
        return;
      }
    } else if (!product.inStock) {
      res.status(400).json({ error: `Product "${product.name}" is out of stock` });
      return;
    }
  }

  // ── 2. Build items with server-authoritative prices ───────────────────────
  // Each line uses the selected variant's own name/weight/price snapshot when
  // present, otherwise the base product's — non-variant orders are unaffected.
  const items = rawItems.map((raw) => {
    const id = parseInt(raw.productId, 10);
    const p = productMap.get(id)!;
    if (raw.variantId) {
      const v = variantMap.get(parseInt(raw.variantId, 10))!;
      return {
        productId: String(p.id),
        variantId: String(v.id),
        name: `${p.name} (${v.weight})`,
        brand: p.brand,
        weight: v.weight,
        qty: raw.qty,
        price: v.price,
      };
    }
    return { productId: String(p.id), name: p.name, brand: p.brand, weight: p.weight, qty: raw.qty, price: p.price };
  });

  // ── 3. Compute totals server-side using live settings ────────────────────
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const feeSettings = await getSettings();

  // Enforce minimum order value if enabled
  if (feeSettings.minOrderEnabled && subtotal < feeSettings.minOrderValue) {
    res.status(400).json({
      error: `Minimum order value is ₹${feeSettings.minOrderValue}. Please add more items to your cart.`,
    });
    return;
  }
  const smallCartFee = computeSmallCartFee(subtotal, feeSettings);
  const deliveryFee = computeDeliveryFee(subtotal, feeSettings);
  const handlingFee = feeSettings.handlingFee;
  const grandTotal = subtotal + smallCartFee + deliveryFee + handlingFee;

  // ── 4. Fetch customer address ─────────────────────────────────────────────
  const [address] = await db.select().from(addressesTable).where(eq(addressesTable.userId, user.id));

  if (!address) {
    res.status(400).json({ error: "No delivery address on file. Please update your profile." });
    return;
  }

  // ── 5. Insert with retry on order_number collision ────────────────────────
  const values = {
    customerId: user.id,
    customerName: user.name,
    customerMobile: user.mobile,
    address: { houseNumber: address.houseNumber, area: address.area, landmark: address.landmark ?? "", pincode: address.pincode },
    items,
    subtotal,
    smallCartFee,
    deliveryFee,
    handlingFee,
    grandTotal,
    paymentMethod,
    orderNote: orderNote?.trim() || null,
    status: "new",
    isNew: true,
  };

  // Variant lines to decrement stock for, inside the same transaction as the
  // order insert so a race between two concurrent orders can't oversell a
  // pack size — the conditional WHERE clause makes each decrement atomic.
  const variantDecrements = items
    .filter((it): it is typeof it & { variantId: string } => "variantId" in it)
    .map((it) => ({ variantId: parseInt(it.variantId, 10), qty: it.qty, name: it.name }));

  let inserted: Record<string, unknown> | undefined;
  let outOfStockError: string | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      inserted = await db.transaction(async (tx) => {
        for (const dec of variantDecrements) {
          const [updated] = await tx
            .update(productVariantsTable)
            .set({ stockQty: sql`${productVariantsTable.stockQty} - ${dec.qty}`, updatedAt: new Date() })
            .where(and(eq(productVariantsTable.id, dec.variantId), sql`${productVariantsTable.stockQty} >= ${dec.qty}`))
            .returning({ id: productVariantsTable.id });
          if (!updated) {
            outOfStockError = `"${dec.name}" is out of stock`;
            throw new Error("VARIANT_OUT_OF_STOCK");
          }
        }

        const [row] = await tx
          .insert(ordersTable)
          .values({ ...values, orderNumber: makeOrderNumber() })
          .returning();
        return row as unknown as Record<string, unknown>;
      });
      break;
    } catch (err: unknown) {
      if (outOfStockError) break;
      const isUniqueViolation =
        typeof err === "object" && err !== null && "code" in err &&
        (err as { code?: string }).code === "23505";
      if (isUniqueViolation && attempt < 3) continue;
      throw err;
    }
  }

  if (outOfStockError) {
    res.status(400).json({ error: outOfStockError });
    return;
  }

  if (!inserted) {
    res.status(500).json({ error: "Failed to generate a unique order number. Please try again." });
    return;
  }

  const serialized = serializeOrder(inserted);

  // ── 6. Notify admin SSE stream ────────────────────────────────────────────
  orderEvents.emit("newOrder", serialized);

  res.status(201).json(serialized);
});

export default router;
