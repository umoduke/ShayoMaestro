import { Router, type IRouter } from "express";
import { db, adminEmailsTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPER_ADMIN_EMAIL = "admin@asl.com";

function normalizeEmail(input: unknown): string {
  return String(input ?? "").toLowerCase().trim();
}

router.get("/admins", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(adminEmailsTable)
      .orderBy(asc(adminEmailsTable.createdAt));
    return res.json({ admins: rows });
  } catch (err) {
    logger.error({ err }, "Failed to list admins");
    return res.status(500).json({ error: "Failed to list admins" });
  }
});

router.get("/admins/check/:email", async (req, res) => {
  try {
    const email = normalizeEmail(req.params.email);
    if (email === SUPER_ADMIN_EMAIL) {
      return res.json({ isAdmin: true });
    }
    const [row] = await db
      .select()
      .from(adminEmailsTable)
      .where(eq(adminEmailsTable.email, email))
      .limit(1);
    return res.json({ isAdmin: Boolean(row) });
  } catch (err) {
    logger.error({ err }, "Failed to check admin");
    return res.status(500).json({ error: "Failed to check admin" });
  }
});

router.post("/admins", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const addedBy = req.body?.addedBy ? String(req.body.addedBy) : null;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email is required" });
    }
    if (email === SUPER_ADMIN_EMAIL) {
      return res
        .status(400)
        .json({ error: "This account is already a permanent admin" });
    }
    const [admin] = await db
      .insert(adminEmailsTable)
      .values({ email, addedBy })
      .onConflictDoNothing()
      .returning();
    if (!admin) {
      const [existing] = await db
        .select()
        .from(adminEmailsTable)
        .where(eq(adminEmailsTable.email, email))
        .limit(1);
      return res.json({ admin: existing });
    }
    return res.json({ admin });
  } catch (err) {
    logger.error({ err }, "Failed to add admin");
    return res.status(500).json({ error: "Failed to add admin" });
  }
});

router.delete("/admins/:email", async (req, res) => {
  try {
    const email = normalizeEmail(req.params.email);
    if (email === SUPER_ADMIN_EMAIL) {
      return res
        .status(400)
        .json({ error: "The permanent admin cannot be removed" });
    }
    await db.delete(adminEmailsTable).where(eq(adminEmailsTable.email, email));
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to remove admin");
    return res.status(500).json({ error: "Failed to remove admin" });
  }
});

export default router;
