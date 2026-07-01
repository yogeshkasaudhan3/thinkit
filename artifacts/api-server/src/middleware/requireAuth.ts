import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type AuthUser = typeof usersTable.$inferSelect;

/**
 * Middleware that reads userId from session, loads the user from DB,
 * and stores it in res.locals.user. Returns 401 if not authenticated.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    req.session.destroy(() => undefined);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.locals.user = user as AuthUser;
  next();
}
