import { Router, type IRouter, type Request, type Response } from "express";
import { db, ordersTable, type Order } from "@workspace/db";
import { sql, gte, lte, and } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";

const router: IRouter = Router();

// ── Shared date-range parsing ────────────────────────────────────────────────
// `from`/`to` are plain YYYY-MM-DD strings from the admin panel's date filter.
// We treat them as inclusive day boundaries.
function parseRange(req: Request): { from: Date; to: Date } | null {
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  if (!from || !to) return null;

  const fromDate = new Date(`${from}T00:00:00.000`);
  const toDate = new Date(`${to}T23:59:59.999`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return null;

  return { from: fromDate, to: toDate };
}

type OrderItem = { productId: number | null; name: string; brand: string; weight: string; qty: number; price: number };

// ── GET /admin/reports/summary ───────────────────────────────────────────────
router.get("/admin/reports/summary", requireAdmin, async (req, res): Promise<void> => {
  const range = parseRange(req);
  if (!range) {
    res.status(400).json({ error: "from and to query params are required (YYYY-MM-DD)" });
    return;
  }

  const dateFilter = and(gte(ordersTable.createdAt, range.from), lte(ordersTable.createdAt, range.to));

  // totalSales/avgOrderValue only count delivered + paid orders — same rule as
  // the main dashboard's "todaySales" (never cancelled, never unpaid).
  const [stats] = await db
    .select({
      totalSales: sql<string>`COALESCE(SUM(${ordersTable.grandTotal}) FILTER (
        WHERE ${ordersTable.status} = 'delivered' AND ${ordersTable.paymentStatus} = 'paid'
      ), 0)`,
      totalOrders: sql<string>`COUNT(*)`,
      deliveredOrders: sql<string>`COUNT(*) FILTER (WHERE ${ordersTable.status} = 'delivered')`,
      cancelledOrders: sql<string>`COUNT(*) FILTER (WHERE ${ordersTable.status} = 'cancelled')`,
      pending: sql<string>`COUNT(*) FILTER (WHERE ${ordersTable.status} = 'new')`,
      confirmed: sql<string>`COUNT(*) FILTER (WHERE ${ordersTable.status} IN ('accepted', 'packing'))`,
      outForDelivery: sql<string>`COUNT(*) FILTER (WHERE ${ordersTable.status} = 'out_for_delivery')`,
    })
    .from(ordersTable)
    .where(dateFilter);

  const totalSales = Number(stats?.totalSales ?? 0);
  const deliveredOrders = Number(stats?.deliveredOrders ?? 0);

  res.json({
    totalSales,
    totalOrders: Number(stats?.totalOrders ?? 0),
    avgOrderValue: deliveredOrders > 0 ? Math.round(totalSales / deliveredOrders) : 0,
    deliveredOrders,
    cancelledOrders: Number(stats?.cancelledOrders ?? 0),
    statusBreakdown: {
      pending: Number(stats?.pending ?? 0),
      confirmed: Number(stats?.confirmed ?? 0),
      outForDelivery: Number(stats?.outForDelivery ?? 0),
      delivered: deliveredOrders,
      cancelled: Number(stats?.cancelledOrders ?? 0),
    },
  });
});

// ── GET /admin/reports/daily-sales ───────────────────────────────────────────
router.get("/admin/reports/daily-sales", requireAdmin, async (req, res): Promise<void> => {
  const daysRaw = typeof req.query.days === "string" ? parseInt(req.query.days, 10) : 7;
  const days = daysRaw === 30 ? 30 : 7;

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await db
    .select({
      day: sql<string>`to_char(${ordersTable.createdAt}, 'YYYY-MM-DD')`,
      sales: sql<string>`COALESCE(SUM(${ordersTable.grandTotal}) FILTER (
        WHERE ${ordersTable.status} = 'delivered' AND ${ordersTable.paymentStatus} = 'paid'
      ), 0)`,
      orders: sql<string>`COUNT(*)`,
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, since))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const byDay = new Map(rows.map((r) => [r.day, { sales: Number(r.sales), orders: Number(r.orders) }]));

  // Fill in every day in the range, even ones with zero orders, so the chart
  // doesn't have gaps.
  const result: { date: string; sales: number; orders: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const entry = byDay.get(key);
    result.push({ date: key, sales: entry?.sales ?? 0, orders: entry?.orders ?? 0 });
  }

  res.json(result);
});

// ── GET /admin/reports/top-products ──────────────────────────────────────────
router.get("/admin/reports/top-products", requireAdmin, async (req, res): Promise<void> => {
  const range = parseRange(req);
  if (!range) {
    res.status(400).json({ error: "from and to query params are required (YYYY-MM-DD)" });
    return;
  }
  const limit = typeof req.query.limit === "string" ? Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10)) : 10;

  // Only orders that actually generated revenue count toward "top selling",
  // consistent with the totalSales rule (delivered + paid).
  const orders = await db
    .select({ items: ordersTable.items })
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, range.from),
        lte(ordersTable.createdAt, range.to),
        sql`${ordersTable.status} = 'delivered' AND ${ordersTable.paymentStatus} = 'paid'`,
      ),
    );

  const agg = new Map<string, { productId: number | null; name: string; brand: string; qtySold: number; revenue: number }>();
  for (const order of orders) {
    const items = (order.items as OrderItem[] | null) ?? [];
    for (const item of items) {
      const key = item.productId != null ? String(item.productId) : `name:${item.name}`;
      const existing = agg.get(key);
      const qty = Number(item.qty) || 0;
      const revenue = qty * (Number(item.price) || 0);
      if (existing) {
        existing.qtySold += qty;
        existing.revenue += revenue;
      } else {
        agg.set(key, { productId: item.productId ?? null, name: item.name, brand: item.brand, qtySold: qty, revenue });
      }
    }
  }

  const sorted = Array.from(agg.values()).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  res.json(sorted);
});

// ── GET /admin/reports/export ─────────────────────────────────────────────────
// Raw CSV download (not part of the OpenAPI/orval-generated client — same
// pattern as /admin/products/export). Fetched directly via fetch() + blob on
// the frontend.
router.get("/admin/reports/export", requireAdmin, async (req, res): Promise<void> => {
  const range = parseRange(req);
  if (!range) {
    res.status(400).json({ error: "from and to query params are required (YYYY-MM-DD)" });
    return;
  }

  const orders = (await db
    .select()
    .from(ordersTable)
    .where(and(gte(ordersTable.createdAt, range.from), lte(ordersTable.createdAt, range.to)))
    .orderBy(sql`${ordersTable.createdAt} ASC`)) as Order[];

  const header = [
    "Order Number",
    "Date",
    "Customer Name",
    "Customer Mobile",
    "Status",
    "Payment Status",
    "Items",
    "Subtotal",
    "Delivery Fee",
    "Handling Fee",
    "Grand Total",
  ];

  const escapeCsv = (v: unknown): string => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [header.join(",")];
  for (const o of orders) {
    const items = (o.items as OrderItem[] | null) ?? [];
    const itemsSummary = items.map((i) => `${i.name} x${i.qty}`).join("; ");
    lines.push(
      [
        o.orderNumber,
        o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
        o.customerName,
        o.customerMobile,
        o.status,
        o.paymentStatus ?? "",
        itemsSummary,
        o.subtotal,
        o.deliveryFee,
        o.handlingFee,
        o.grandTotal,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="thinkit-sales-report-${req.query.from}-to-${req.query.to}.csv"`);
  res.send(csv);
});

export default router;
