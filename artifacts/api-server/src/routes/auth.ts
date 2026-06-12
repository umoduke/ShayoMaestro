import { Router, type IRouter } from "express";
import { createAdminToken, verifySuperAdminPassword } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Admin login. Only the super-admin (store owner) holds a server-verified
// password, so only that account can obtain an admin session token. The token
// is then sent as a Bearer header on every admin-only request.
router.post("/auth/admin-login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "")
      .toLowerCase()
      .trim();
    const password = String(req.body?.password ?? "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (!verifySuperAdminPassword(email, password)) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }
    const token = createAdminToken(email);
    return res.json({ token, email, isAdmin: true });
  } catch (err) {
    logger.error({ err }, "Admin login failed");
    return res.status(500).json({ error: "Login failed" });
  }
});

export default router;
