import { Router, type IRouter } from "express";
import {
  db,
  promoCodesTable,
  promoRedemptionsTable,
  usersTable,
  type PromoCode,
} from "@workspace/db";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getTokenPayload } from "../lib/auth";
import { computeTier, type Tier } from "../lib/loyalty";
import { evaluatePromo } from "../lib/promoEngine";

const router: IRouter = Router();

const PROMO_TYPES = [
  "single_use",
  "referral",
  "milestone",
  "winback",
  "seasonal",
] as const;
const DISCOUNT_TYPES = ["percent", "flat"] as const;
const TIERS: Tier[] = ["bronze", "silver", "gold"];

function isDuplicateCodeError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : null;
}

function nonNegInt(v: unknown, fallback = 0): number {
  const n = Math.floor(Number(v ?? fallback));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function normalizeBody(body: any) {
  const rawTiers = Array.isArray(body?.eligibleTiers) ? body.eligibleTiers : [];
  const eligibleTiers = rawTiers
    .map((t: unknown) => String(t).toLowerCase())
    .filter((t: string): t is Tier => (TIERS as string[]).includes(t));

  const type = PROMO_TYPES.includes(body?.type)
    ? String(body.type)
    : "seasonal";
  const discountType = DISCOUNT_TYPES.includes(body?.discountType)
    ? String(body.discountType)
    : "percent";

  let expiresAt: Date | null = null;
  if (body?.expiresAt) {
    const d = new Date(String(body.expiresAt));
    if (!Number.isNaN(d.getTime())) expiresAt = d;
  }

  return {
    code: String(body?.code ?? "").trim().toUpperCase(),
    type,
    discountType,
    discountValue: nonNegInt(body?.discountValue, 0),
    minOrderKobo: nonNegInt(body?.minOrderKobo, 0),
    maxDiscountKobo: intOrNull(body?.maxDiscountKobo),
    expiresAt,
    maxUses: intOrNull(body?.maxUses),
    perUserLimit: Math.max(1, nonNegInt(body?.perUserLimit, 1)),
    eligibleTiers: eligibleTiers.length > 0 ? eligibleTiers : null,
    stackable: Boolean(body?.stackable ?? false),
    active: body?.active === undefined ? true : Boolean(body.active),
    description: body?.description ? String(body.description) : null,
  };
}

/**
 * Resolve the caller's tier + a stable identity (user id / email) for
 * per-user redemption limits. Guests fall back to bronze and email-only
 * tracking.
 */
async function resolveCustomer(
  authorization: string | undefined,
  email: string | null,
): Promise<{ userId: string | null; email: string | null; tier: Tier }> {
  const payload = getTokenPayload(authorization);
  if (payload?.sub) {
    const [u] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        totalSpendKobo: usersTable.totalSpendKobo,
      })
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1);
    if (u) {
      return { userId: u.id, email: u.email, tier: computeTier(u.totalSpendKobo) };
    }
  }
  return { userId: null, email: email?.trim().toLowerCase() || null, tier: "bronze" };
}

/** Count prior redemptions by this customer (user id OR email). */
async function redemptionCount(
  promoCodeId: string,
  userId: string | null,
  email: string | null,
): Promise<number> {
  const ids = [];
  if (userId) ids.push(eq(promoRedemptionsTable.userId, userId));
  if (email) ids.push(eq(promoRedemptionsTable.email, email));
  if (ids.length === 0) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(promoRedemptionsTable)
    .where(
      and(eq(promoRedemptionsTable.promoCodeId, promoCodeId), or(...ids)),
    );
  return row?.n ?? 0;
}

export async function findPromoByCode(code: string): Promise<PromoCode | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const [row] = await db
    .select()
    .from(promoCodesTable)
    .where(eq(promoCodesTable.code, normalized))
    .limit(1);
  return row ?? null;
}

// --- Public: validate a code at checkout (preview only) -------------------
router.post("/promos/validate", async (req, res) => {
  try {
    const code = String(req.body?.code ?? "").trim();
    const subtotalKobo = nonNegInt(req.body?.subtotalKobo, 0);
    if (!code) return res.status(400).json({ error: "code required" });

    const row = await findPromoByCode(code);
    if (!row) {
      return res.json({
        valid: false,
        reason: "invalid",
        message: "This code is not valid.",
        discountKobo: 0,
      });
    }

    const customer = await resolveCustomer(
      req.headers.authorization,
      req.body?.email ? String(req.body.email) : null,
    );
    const used = await redemptionCount(row.id, customer.userId, customer.email);
    const result = evaluatePromo({
      code: row,
      subtotalKobo,
      tier: customer.tier,
      redemptionCount: used,
    });

    return res.json({
      valid: result.ok,
      reason: result.reason ?? null,
      message: result.message ?? null,
      discountKobo: result.discountKobo,
      code: {
        code: row.code,
        description: row.description,
        discountType: row.discountType,
        discountValue: row.discountValue,
        stackable: row.stackable,
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to validate promo");
    return res.status(500).json({ error: "Failed to validate promo" });
  }
});

// --- Admin: list with analytics ------------------------------------------
router.get("/promos", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(promoCodesTable)
      .orderBy(desc(promoCodesTable.createdAt));
    return res.json({ promos: rows });
  } catch (err) {
    logger.error({ err }, "Failed to list promos");
    return res.status(500).json({ error: "Failed to list promos" });
  }
});

router.get("/promos/:id", requireAdmin, async (req, res) => {
  try {
    const [promo] = await db
      .select()
      .from(promoCodesTable)
      .where(eq(promoCodesTable.id, String(req.params.id)))
      .limit(1);
    if (!promo) return res.status(404).json({ error: "Not found" });
    const [agg] = await db
      .select({
        redemptions: sql<number>`count(*)::int`,
        totalDiscountKobo: sql<number>`coalesce(sum(${promoRedemptionsTable.discountKobo}), 0)::int`,
      })
      .from(promoRedemptionsTable)
      .where(eq(promoRedemptionsTable.promoCodeId, promo.id));
    return res.json({
      promo,
      analytics: {
        redemptions: agg?.redemptions ?? 0,
        totalDiscountKobo: agg?.totalDiscountKobo ?? 0,
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch promo");
    return res.status(500).json({ error: "Failed to fetch promo" });
  }
});

router.post("/promos", requireAdmin, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (!data.code) return res.status(400).json({ error: "code required" });
    if (data.discountValue <= 0) {
      return res.status(400).json({ error: "discountValue must be positive" });
    }
    if (data.discountType === "percent" && data.discountValue > 100) {
      return res.status(400).json({ error: "percent discount cannot exceed 100" });
    }
    const [promo] = await db.insert(promoCodesTable).values(data).returning();
    return res.json({ promo });
  } catch (err) {
    if (isDuplicateCodeError(err)) {
      return res.status(409).json({ error: "That code already exists" });
    }
    logger.error({ err }, "Failed to create promo");
    return res.status(500).json({ error: "Failed to create promo" });
  }
});

router.patch("/promos/:id", requireAdmin, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (!data.code) return res.status(400).json({ error: "code required" });
    if (data.discountValue <= 0) {
      return res.status(400).json({ error: "discountValue must be positive" });
    }
    const [promo] = await db
      .update(promoCodesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(promoCodesTable.id, String(req.params.id)))
      .returning();
    if (!promo) return res.status(404).json({ error: "Not found" });
    return res.json({ promo });
  } catch (err) {
    if (isDuplicateCodeError(err)) {
      return res.status(409).json({ error: "That code already exists" });
    }
    logger.error({ err }, "Failed to update promo");
    return res.status(500).json({ error: "Failed to update promo" });
  }
});

router.delete("/promos/:id", requireAdmin, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(promoCodesTable)
      .where(eq(promoCodesTable.id, String(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete promo");
    return res.status(500).json({ error: "Failed to delete promo" });
  }
});

export default router;
