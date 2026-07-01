/**
 * Public categories route — no authentication required.
 * Only active categories are exposed to the customer app.
 */
import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.status, "active"))
    .orderBy(categoriesTable.displayOrder);

  res.json(cats);
});

export default router;
