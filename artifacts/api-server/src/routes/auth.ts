import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createAdminToken,
  createUserToken,
  verifySuperAdminPassword,
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
  isAdminEmail,
  getTokenPayload,
} from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Shape returned to clients — never includes passwordHash.
async function toPublicUser(row: typeof usersTable.$inferSelect) {
  const isAdmin = await isAdminEmail(row.email);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    birthday: row.birthday,
    tier: row.tier,
    points: row.points,
    totalSpendKobo: row.totalSpendKobo,
    isAdmin,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

// Customer signup — creates a DB-backed account and returns a session token.
router.post("/auth/signup", async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "")
      .toLowerCase()
      .trim();
    const password = String(req.body?.password ?? "");
    const phone = req.body?.phone ? String(req.body.phone).trim() : null;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please fill in all fields" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

    const isAdmin = await isAdminEmail(email);
    const [row] = await db
      .insert(usersTable)
      .values({
        name,
        email,
        phone,
        passwordHash: hashPassword(password),
        isAdmin,
      })
      .returning();

    if (!row) {
      return res.status(500).json({ error: "Could not create account" });
    }
    const token = createUserToken(row.id, row.email);
    return res.json({ token, user: await toPublicUser(row) });
  } catch (err) {
    logger.error({ err }, "Signup failed");
    return res.status(500).json({ error: "Could not create account" });
  }
});

// Customer login.
router.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "")
      .toLowerCase()
      .trim();
    const password = String(req.body?.password ?? "");
    if (!email || !password) {
      return res.status(400).json({ error: "Please fill in all fields" });
    }

    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    // Verify against a found row, or run a dummy hash to keep timing uniform so
    // attackers can't distinguish "no such email" from "wrong password".
    const ok = row
      ? verifyPassword(password, row.passwordHash)
      : verifyPassword(password, DUMMY_PASSWORD_HASH);
    if (!row || !ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = createUserToken(row.id, row.email);
    return res.json({ token, user: await toPublicUser(row) });
  } catch (err) {
    logger.error({ err }, "Login failed");
    return res.status(500).json({ error: "Login failed" });
  }
});

// Returns the current user for a valid session token. Used on app launch to
// re-sync the account (tier/points/admin status) from the server.
router.get("/auth/me", async (req, res) => {
  try {
    const payload = getTokenPayload(req.headers.authorization);
    if (!payload?.sub) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1);
    if (!row) return res.status(404).json({ error: "Account not found" });
    return res.json({ user: await toPublicUser(row) });
  } catch (err) {
    logger.error({ err }, "Failed to load current user");
    return res.status(500).json({ error: "Failed to load account" });
  }
});

// Update the current user's profile (name, phone, birthday).
router.patch("/auth/profile", async (req, res) => {
  try {
    const payload = getTokenPayload(req.headers.authorization);
    if (!payload?.sub) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const updates: Partial<typeof usersTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: "Name cannot be empty" });
      updates.name = name;
    }
    if (req.body?.phone !== undefined) {
      updates.phone = req.body.phone ? String(req.body.phone).trim() : null;
    }
    if (req.body?.birthday !== undefined) {
      updates.birthday = req.body.birthday ? String(req.body.birthday) : null;
    }

    const [row] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, payload.sub))
      .returning();
    if (!row) return res.status(404).json({ error: "Account not found" });
    return res.json({ user: await toPublicUser(row) });
  } catch (err) {
    logger.error({ err }, "Failed to update profile");
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
