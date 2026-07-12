import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, addressesTable, passwordResetRequestsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, type AuthUser } from "../middleware/requireAuth";

const router = Router();

// ─── Sign Up ──────────────────────────────────────────────────────────────────
router.post("/auth/signup", async (req: Request, res: Response): Promise<void> => {
  const { name, mobile, password, houseNumber, area, landmark, pincode } =
    req.body as Record<string, string | undefined>;

  if (!name?.trim() || !mobile?.trim() || !password || !houseNumber?.trim() || !area?.trim() || !pincode?.trim()) {
    res.status(400).json({ error: "name, mobile, password, houseNumber, area, and pincode are required" });
    return;
  }
  if (!/^\d{10}$/.test(mobile.trim())) {
    res.status(400).json({ error: "Mobile must be a 10-digit number" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  if (!/^\d{6}$/.test(pincode.trim())) {
    res.status(400).json({ error: "Pincode must be 6 digits" });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.mobile, mobile.trim()));

  if (existing) {
    res.status(409).json({ error: "Mobile number is already registered. Please log in." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ mobile: mobile.trim(), name: name.trim(), passwordHash })
    .returning();

  await db.insert(addressesTable).values({
    userId: user.id,
    houseNumber: houseNumber.trim(),
    area: area.trim(),
    landmark: (landmark ?? "").trim(),
    pincode: pincode.trim(),
  });

  // Regenerate session ID to prevent session fixation
  req.session.regenerate((err) => {
    if (err) { res.status(500).json({ error: "Session error" }); return; }
    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) { res.status(500).json({ error: "Session error" }); return; }
      res.status(201).json({ success: true });
    });
  });
});

// ─── Log In ───────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { mobile, password } = req.body as Record<string, string | undefined>;

  if (!mobile?.trim() || !password) {
    res.status(400).json({ error: "Mobile and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.mobile, mobile.trim()));

  if (!user) {
    res.status(404).json({ code: "USER_NOT_FOUND", error: "You are a new customer. Please create an account first." });
    return;
  }

  // Accept either the permanent password, or — if one was issued by an admin
  // via the manual password-reset flow — the temporary password. Logging in
  // with the temporary password is still allowed even though it does not
  // change the account's permanent password; the client is forced to the
  // "create new password" screen (via forcePasswordChange) before it can do
  // anything else.
  let valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid && user.temporaryPasswordHash) {
    valid = await bcrypt.compare(password, user.temporaryPasswordHash);
  }
  if (!valid) {
    res.status(401).json({ code: "WRONG_PASSWORD", error: "Incorrect password. Please try again." });
    return;
  }

  // Regenerate session ID to prevent session fixation
  req.session.regenerate((err) => {
    if (err) { res.status(500).json({ error: "Session error" }); return; }
    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) { res.status(500).json({ error: "Session error" }); return; }
      res.json({ success: true });
    });
  });
});

// ─── Current user ─────────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const user = res.locals.user as AuthUser;

  const [address] = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, user.id));

  res.json({
    authenticated: true,
    user: { id: user.id, name: user.name, mobile: user.mobile },
    address: address ?? null,
    forcePasswordChange: user.forcePasswordChange,
  });
});

// ─── Forgot Password (manual admin reset request) ─────────────────────────────
// The response is ALWAYS identical regardless of whether the mobile number
// is registered, to avoid leaking account existence.
const FORGOT_PASSWORD_MESSAGE =
  "If this mobile number is registered, your password reset request has been submitted. Our support team will contact you shortly.";

router.post("/auth/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { mobile } = req.body as Record<string, string | undefined>;

  if (!mobile?.trim() || !/^\d{10}$/.test(mobile.trim())) {
    // Still return the generic message — never confirm/deny format-level issues either.
    res.json({ message: FORGOT_PASSWORD_MESSAGE });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.mobile, mobile.trim()));

  if (user) {
    const [existingPending] = await db
      .select({ id: passwordResetRequestsTable.id })
      .from(passwordResetRequestsTable)
      .where(and(eq(passwordResetRequestsTable.userId, user.id), eq(passwordResetRequestsTable.status, "pending")));

    if (!existingPending) {
      await db.insert(passwordResetRequestsTable).values({ userId: user.id });
    }

    await db
      .update(usersTable)
      .set({ passwordResetRequestedAt: new Date() })
      .where(eq(usersTable.id, user.id));
  }

  res.json({ message: FORGOT_PASSWORD_MESSAGE });
});

// ─── Create New Password (after logging in with a temporary password) ─────────
router.post("/auth/change-forced-password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = res.locals.user as AuthUser;
  const { newPassword, confirmPassword } = req.body as Record<string, string | undefined>;

  if (!authUser.forcePasswordChange) {
    res.status(400).json({ error: "No password change is required for this account." });
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(usersTable)
    .set({ passwordHash, temporaryPasswordHash: null, forcePasswordChange: false })
    .where(eq(usersTable.id, authUser.id));

  await db
    .update(passwordResetRequestsTable)
    .set({ status: "completed", resolvedAt: new Date() })
    .where(and(eq(passwordResetRequestsTable.userId, authUser.id), eq(passwordResetRequestsTable.status, "pending")));

  res.json({ success: true });
});

// ─── Update Address ───────────────────────────────────────────────────────────
router.put("/auth/address", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = res.locals.user as AuthUser;
  const { houseNumber, area, landmark, pincode } = req.body as Record<string, string | undefined>;

  if (!houseNumber?.trim() || !area?.trim() || !pincode?.trim()) {
    res.status(400).json({ error: "houseNumber, area, and pincode are required" });
    return;
  }
  if (!/^\d{6}$/.test(pincode.trim())) {
    res.status(400).json({ error: "Pincode must be 6 digits" });
    return;
  }

  const [updated] = await db
    .insert(addressesTable)
    .values({
      userId: user.id,
      houseNumber: houseNumber.trim(),
      area: area.trim(),
      landmark: (landmark ?? "").trim(),
      pincode: pincode.trim(),
    })
    .onConflictDoUpdate({
      target: addressesTable.userId,
      set: {
        houseNumber: sql`excluded.house_number`,
        area: sql`excluded.area`,
        landmark: sql`excluded.landmark`,
        pincode: sql`excluded.pincode`,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  res.json({ success: true, address: updated });
});

// ─── Log Out ──────────────────────────────────────────────────────────────────
router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

export default router;
