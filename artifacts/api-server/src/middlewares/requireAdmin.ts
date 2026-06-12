import type { RequestHandler } from "express";
import { verifyAdminToken, isAdminEmail } from "../lib/auth";

// Gate for admin-only endpoints. Requires a valid `Authorization: Bearer
// <token>` header signed by this server, and re-checks that the token's email
// still has admin rights (so a removed admin's unexpired token stops working).
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  const stillAdmin = await isAdminEmail(payload.email);
  if (!stillAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};
