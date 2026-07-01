import { Router, type Request, type Response } from "express";
import passport from "passport";
import { db, addressesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// ─── Initiate Google OAuth ────────────────────────────────────────────────────
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// ─── Google OAuth callback ────────────────────────────────────────────────────
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/signin?error=auth_failed",
  }),
  (req: Request, res: Response): void => {
    const user = req.user as Express.User;
    res.redirect(user.profileComplete ? "/home" : "/setup");
  },
);

// ─── Get current session user + address ──────────────────────────────────────
router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ authenticated: false });
    return;
  }

  const user = req.user as Express.User;
  const [address] = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, user.id));

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      phone: user.phone,
      profileComplete: user.profileComplete,
    },
    address: address ?? null,
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/auth/logout", (req: Request, res: Response): void => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});

export default router;
