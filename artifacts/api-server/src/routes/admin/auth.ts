import { Router, type IRouter } from "express";
import { AdminLoginBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middleware/requireAdmin";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

const router: IRouter = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Regenerate session for security
  req.session.regenerate((err) => {
    if (err) {
      req.log.error({ err }, "Admin session regeneration failed");
      res.status(500).json({ error: "Login failed" });
      return;
    }
    req.session.adminId = ADMIN_USERNAME;
    res.json({ username: ADMIN_USERNAME });
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

export default router;
