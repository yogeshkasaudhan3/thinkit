import { Router, type IRouter } from "express";
import { db, ordersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";

const router: IRouter = Router();

router.get("/admin/dashboard", requireAdmin, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Aggregate stats in a single query
  const [stats] = await db
    .select({
      todayOrders: sql<string>`COUNT(*) FILTER (WHERE ${ordersTable.createdAt} >= ${today.toISOString()}::timestamptz)`,
      todaySales: sql<string>`COALESCE(SUM(${ordersTable.grandTotal}) FILTER (WHERE ${ordersTable.createdAt} >= ${today.toISOString()}::timestamptz), 0)`,
      pendingOrders: sql<string>`COUNT(*) FILTER (WHERE ${ordersTable.status} IN ('new', 'accepted', 'packing'))`,
      outForDelivery: sql<string>`COUNT(*) FILTER (WHERE ${ordersTable.status} = 'out_for_delivery')`,
    })
    .from(ordersTable);

  // Recent orders (latest 10)
  const recentOrders = await db
    .select()
    .from(ordersTable)
    .orderBy(sql`${ordersTable.createdAt} DESC`)
    .limit(10);

  res.json({
    todayOrders: Number(stats?.todayOrders ?? 0),
    todaySales: Number(stats?.todaySales ?? 0),
    pendingOrders: Number(stats?.pendingOrders ?? 0),
    outForDelivery: Number(stats?.outForDelivery ?? 0),
    avgDeliveryMinutes: 12,
    recentOrders: recentOrders.map(serializeOrder),
  });
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
