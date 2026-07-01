import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, addressesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

  const valid = await bcrypt.compare(password, user.passwordHash);
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
  });
});

// ─── Log Out ──────────────────────────────────────────────────────────────────
router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

export default router;
