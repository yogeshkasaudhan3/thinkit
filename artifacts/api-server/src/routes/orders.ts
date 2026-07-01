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
import { db, ordersTable, addressesTable, productsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthUser } from "../middleware/requireAuth";
import { orderEvents } from "../lib/orderEvents";

const router: IRouter = Router();

// ── Pricing constants (must match the customer app) ───────────────────────────
const HANDLING_FEE = 5;

function computeSmallCartFee(subtotal: number): number {
  return subtotal > 0 && subtotal < 100 ? 20 : 0;
}

function computeDeliveryFee(subtotal: number): number {
  return subtotal >= 150 ? 0 : 20;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawItem {
  productId: string;
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

  const id = parseInt(req.params.id, 10);
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
    if (!product.inStock) {
      res.status(400).json({ error: `Product "${product.name}" is out of stock` });
      return;
    }
  }

  // ── 2. Build items with server-authoritative prices ───────────────────────
  const items = rawItems.map((raw) => {
    const id = parseInt(raw.productId, 10);
    const p = productMap.get(id)!;
    return { productId: String(p.id), name: p.name, brand: p.brand, weight: p.weight, qty: raw.qty, price: p.price };
  });

  // ── 3. Compute totals server-side ─────────────────────────────────────────
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const smallCartFee = computeSmallCartFee(subtotal);
  const deliveryFee = computeDeliveryFee(subtotal);
  const handlingFee = HANDLING_FEE;
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

  let inserted: Record<string, unknown> | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const [row] = await db
        .insert(ordersTable)
        .values({ ...values, orderNumber: makeOrderNumber() })
        .returning();
      inserted = row as unknown as Record<string, unknown>;
      break;
    } catch (err: unknown) {
      const isUniqueViolation =
        typeof err === "object" && err !== null && "code" in err &&
        (err as { code?: string }).code === "23505";
      if (isUniqueViolation && attempt < 3) continue;
      throw err;
    }
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
