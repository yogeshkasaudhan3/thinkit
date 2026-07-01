import { Router, type IRouter, type Request, type Response } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";
import { UpdateOrderStatusBody, UpdateOrderStatusParams } from "@workspace/api-zod";
import { orderEvents } from "../../lib/orderEvents";

const VALID_STATUSES = [
  "new",
  "accepted",
  "packing",
  "out_for_delivery",
  "delivered",
  "cancelled",
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

// ── Update order status ─────────────────────────────────────────────────────
router.patch("/admin/orders/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateOrderStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (!VALID_STATUSES.includes(body.data.status as (typeof VALID_STATUSES)[number])) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }

  const updates: Partial<typeof ordersTable.$inferInsert> & { updatedAt: Date } = {
    status: body.data.status,
    updatedAt: new Date(),
  };

  // Mark as no longer new when accepted
  if (body.data.status === "accepted") {
    (updates as Record<string, unknown>).isNew = false;
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
