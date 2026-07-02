import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";
import { db, adminUsersTable } from "@workspace/db";
import { requireAdmin } from "../../middleware/requireAdmin";

// Minimum password requirements:
//  - At least 8 characters
//  - At least one digit or one special character
function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
  return hasDigitOrSpecial;
}

// Dummy hash used when username is not found — prevents timing-based
// username enumeration by ensuring bcrypt.compare always runs.
const DUMMY_HASH =
  "$2b$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const router: IRouter = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username))
    .limit(1);

  // Always run bcrypt.compare — prevents timing-based username enumeration
  const hashToCompare = admin?.passwordHash ?? DUMMY_HASH;
  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (!admin || !passwordMatch) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Regenerate session to prevent session fixation
  req.session.regenerate((regenErr) => {
    if (regenErr) {
      req.log.error({ err: regenErr }, "Admin session regeneration failed");
      res.status(500).json({ error: "Login failed" });
      return;
    }

    req.session.adminId = admin.username;

    // Persist session to store before responding to avoid race conditions
    req.session.save((saveErr) => {
      if (saveErr) {
        req.log.error({ err: saveErr }, "Admin session save failed");
        res.status(500).json({ error: "Login failed" });
        return;
      }
      res.json({ username: admin.username });
    });
  });
});

router.post("/admin/logout", requireAdmin, (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Admin session destroy failed");
    }
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/admin/me", (req, res): void => {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ username: req.session.adminId });
});

router.post("/admin/change-password", requireAdmin, async (req, res): Promise<void> => {
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    res.status(400).json({ error: "currentPassword, newPassword, and confirmPassword are required." });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: "New password and confirmation do not match." });
    return;
  }

  if (!isStrongPassword(newPassword)) {
    res.status(400).json({
      error: "New password must be at least 8 characters and contain at least one digit or special character.",
    });
    return;
  }

  const adminId = req.session.adminId!;

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, adminId))
    .limit(1);

  if (!admin) {
    res.status(401).json({ error: "Admin account not found." });
    return;
  }

  const passwordMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(adminUsersTable)
    .set({ passwordHash: newHash })
    .where(eq(adminUsersTable.username, adminId));

  req.log.info({ username: adminId }, "Admin password changed");

  res.json({ ok: true });
});

export default router;
