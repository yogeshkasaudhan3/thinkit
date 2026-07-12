import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db, usersTable, passwordResetRequestsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";
import {
  GenerateTempPasswordParams,
  CompletePasswordResetRequestParams,
  RejectPasswordResetRequestParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Characters chosen to avoid visually-ambiguous glyphs (0/O, 1/I/l).
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateTemporaryPassword(): string {
  const randomChars = (len: number) =>
    Array.from(crypto.randomBytes(len))
      .map((b) => TEMP_PASSWORD_CHARS[b % TEMP_PASSWORD_CHARS.length])
      .join("");
  // e.g. THK-7M9Q42
  return `THK-${randomChars(4)}${randomChars(2)}`;
}

function serializeRequest(row: {
  id: number;
  userId: number;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  name: string;
  mobile: string;
}) {
  return {
    id: row.id,
    userId: row.userId,
    customerName: row.name,
    customerMobile: row.mobile,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

// ── List password reset requests ───────────────────────────────────────────
router.get("/admin/password-reset-requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const rows = await db
    .select({
      id: passwordResetRequestsTable.id,
      userId: passwordResetRequestsTable.userId,
      status: passwordResetRequestsTable.status,
      createdAt: passwordResetRequestsTable.createdAt,
      resolvedAt: passwordResetRequestsTable.resolvedAt,
      name: usersTable.name,
      mobile: usersTable.mobile,
    })
    .from(passwordResetRequestsTable)
    .innerJoin(usersTable, eq(passwordResetRequestsTable.userId, usersTable.id))
    .orderBy(desc(passwordResetRequestsTable.createdAt));

  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  res.json(filtered.map(serializeRequest));
});

// ── Generate & assign a temporary password ─────────────────────────────────
router.post(
  "/admin/password-reset-requests/:id/generate-temp-password",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const params = GenerateTempPasswordParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [request] = await db
      .select()
      .from(passwordResetRequestsTable)
      .where(eq(passwordResetRequestsTable.id, params.data.id));

    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const temporaryPassword = generateTemporaryPassword();
    const temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 12);

    await db
      .update(usersTable)
      .set({ temporaryPasswordHash, forcePasswordChange: true })
      .where(eq(usersTable.id, request.userId));

    const [user] = await db
      .select({ name: usersTable.name, mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, request.userId));

    res.json({
      request: serializeRequest({ ...request, name: user?.name ?? "", mobile: user?.mobile ?? "" }),
      temporaryPassword,
    });
  },
);

// ── Manually mark a request completed ──────────────────────────────────────
router.post(
  "/admin/password-reset-requests/:id/complete",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const params = CompletePasswordResetRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [updated] = await db
      .update(passwordResetRequestsTable)
      .set({ status: "completed", resolvedAt: new Date() })
      .where(eq(passwordResetRequestsTable.id, params.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const [user] = await db
      .select({ name: usersTable.name, mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, updated.userId));

    res.json(serializeRequest({ ...updated, name: user?.name ?? "", mobile: user?.mobile ?? "" }));
  },
);

// ── Reject a request (and invalidate any issued temp password) ────────────
router.post(
  "/admin/password-reset-requests/:id/reject",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const params = RejectPasswordResetRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [updated] = await db
      .update(passwordResetRequestsTable)
      .set({ status: "rejected", resolvedAt: new Date() })
      .where(eq(passwordResetRequestsTable.id, params.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    // Invalidate any temporary password issued for this request so it can no longer be used.
    await db
      .update(usersTable)
      .set({ temporaryPasswordHash: null, forcePasswordChange: false })
      .where(eq(usersTable.id, updated.userId));

    const [user] = await db
      .select({ name: usersTable.name, mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, updated.userId));

    res.json(serializeRequest({ ...updated, name: user?.name ?? "", mobile: user?.mobile ?? "" }));
  },
);

export default router;
