import { Router, type IRouter, type Request, type Response } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";
import { UpdateOrderStatusParams } from "@workspace/api-zod";
import { orderEvents } from "../../lib/orderEvents";

const VALID_STATUSES = [
  "new",
  "accepted",
  "packing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

const ADMIN_CANCELLATION_REASONS = [
  "Customer did not answer calls",
  "Customer requested cancellation",
  "Delivery address not serviceable",
  "Product out of stock",
  "Customer unavailable at delivery location",
  "Payment issue",
  "Other",
] as const;

const router: IRouter = Router();

// ── SSE stream — must be before /:id to avoid being matched as a param ─────
router.get("/admin/orders/stream", requireAdmin, (req: Request, res: Response): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send a connected event immediately
  res.write(`event: connected\ndata: {}\n\n`);

  const onNewOrder = (order: unknown) => {
    res.write(`event: newOrder\ndata: ${JSON.stringify(order)}\n\n`);
  };

  orderEvents.on("newOrder", onNewOrder);

  // Keep-alive ping every 25 seconds
  const ping = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25000);

  req.on("close", () => {
    orderEvents.off("newOrder", onNewOrder);
    clearInterval(ping);
  });
});

// ── List orders ─────────────────────────────────────────────────────────────
router.get("/admin/orders", requireAdmin, async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };

  const orders = status
    ? await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.status, status))
        .orderBy(sql`${ordersTable.createdAt} DESC`)
        .limit(300)
    : await db
        .select()
        .from(ordersTable)
        .orderBy(sql`${ordersTable.createdAt} DESC`)
        .limit(300);

  res.json(orders.map(serializeOrder));
});

// ── Get single order ────────────────────────────────────────────────────────
router.get("/admin/orders/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(serializeOrder(order));
});

// ── Admin cancel order (with reason) ────────────────────────────────────────
router.patch("/admin/orders/:id/cancel", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const reason = body.cancellationReason;

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    res.status(400).json({ error: "cancellationReason is required" });
    return;
  }

  // Validate reason is one of the allowed values or a non-empty custom string
  // (we allow any non-empty string so that "Other" + custom text is supported)
  const trimmedReason = reason.trim();
  if (trimmedReason.length > 500) {
    res.status(400).json({ error: "cancellationReason is too long (max 500 chars)" });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({
      status: "cancelled",
      cancellationReason: trimmedReason,
      updatedAt: new Date(),
    })
    .where(
      sql`${ordersTable.id} = ${params.data.id}
          AND ${ordersTable.status} NOT IN ('delivered', 'cancelled')`
    )
    .returning();

  if (!updated) {
    // Diagnose why
    const [existing] = await db
      .select({ status: ordersTable.status })
      .from(ordersTable)
      .where(eq(ordersTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.status(409).json({
      error: `Cannot cancel an order with status "${existing.status}"`,
    });
    return;
  }

  res.json(serializeOrder(updated));
});

// ── Update order status ─────────────────────────────────────────────────────
// When status = 'delivered', also accepts payment fields:
//   paymentStatus: 'paid' | 'unpaid'
//   paymentCollectionMethod: 'cash' | 'upi' | 'mixed'  (required if paid)
//   cashAmount: number   (required if mixed)
//   upiAmount:  number   (required if mixed)
router.patch("/admin/orders/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const newStatus = body.status;

  if (!newStatus || typeof newStatus !== "string") {
    res.status(400).json({ error: "status is required" });
    return;
  }

  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }

  const updates: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  // Mark as no longer new when accepted
  if (newStatus === "accepted") {
    updates.isNew = false;
  }

  // Validate and store payment info when delivering
  if (newStatus === "delivered") {
    const paymentStatus = body.paymentStatus;
    if (!paymentStatus || (paymentStatus !== "paid" && paymentStatus !== "unpaid")) {
      res.status(400).json({ error: "paymentStatus ('paid' or 'unpaid') is required when marking as delivered" });
      return;
    }
    updates.paymentStatus = paymentStatus;

    if (paymentStatus === "paid") {
      const method = body.paymentCollectionMethod;
      if (!method || !["cash", "upi", "mixed"].includes(method as string)) {
        res.status(400).json({ error: "paymentCollectionMethod ('cash', 'upi', or 'mixed') is required when paid" });
        return;
      }
      updates.paymentCollectionMethod = method;

      if (method === "mixed") {
        const cashAmt = body.cashAmount;
        const upiAmt = body.upiAmount;
        if (
          typeof cashAmt !== "number" || cashAmt < 0 ||
          typeof upiAmt !== "number" || upiAmt < 0
        ) {
          res.status(400).json({ error: "cashAmount and upiAmount must be non-negative numbers for mixed payment" });
          return;
        }
        // Fetch the order's grandTotal to validate
        const [existing] = await db
          .select({ grandTotal: ordersTable.grandTotal })
          .from(ordersTable)
          .where(eq(ordersTable.id, params.data.id));
        if (existing && cashAmt + upiAmt !== existing.grandTotal) {
          res.status(400).json({
            error: `Cash (₹${cashAmt}) + UPI (₹${upiAmt}) must equal the order total (₹${existing.grandTotal})`,
          });
          return;
        }
        updates.cashAmount = cashAmt;
        updates.upiAmount = upiAmt;
      }
    } else {
      // unpaid — clear any stale payment method fields
      updates.paymentCollectionMethod = null;
      updates.cashAmount = null;
      updates.upiAmount = null;
    }
  }

  const [updated] = await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(serializeOrder(updated));
});

function serializeOrder(o: Record<string, unknown>) {
  return {
    ...o,
    createdAt:
      o.createdAt instanceof Date
        ? o.createdAt.toISOString()
        : String(o.createdAt ?? ""),
  };
}

export default router;
