/**
 * Public banners route — no authentication required.
 * Only enabled banners are exposed to the customer app.
 */
import { Router, type IRouter } from "express";
import { db, bannersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/banners", async (_req, res): Promise<void> => {
  const banners = await db
    .select()
    .from(bannersTable)
    .where(eq(bannersTable.enabled, true))
    .orderBy(bannersTable.sortOrder);

  res.json(
    banners.map((b) => ({
      ...b,
      createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt ?? ""),
      updatedAt: b.updatedAt instanceof Date ? b.updatedAt.toISOString() : String(b.updatedAt ?? ""),
    }))
  );
});

export default router;
