import type { PromoCode } from "@workspace/db";
import type { Tier } from "./loyalty";

// Pure evaluator for a promo code against a given cart context. Used both by the
// public /promos/validate preview endpoint and (authoritatively) at order
// creation. It never touches the DB — the caller supplies the code row and the
// customer's existing redemption count so the same logic can run inside a
// transaction.

export type PromoRejectReason =
  | "invalid"
  | "inactive"
  | "expired"
  | "min_order"
  | "not_eligible_tier"
  | "already_used"
  | "max_uses_reached";

export interface PromoEvaluation {
  ok: boolean;
  reason?: PromoRejectReason;
  message?: string;
  discountKobo: number;
}

const REASON_MESSAGES: Record<PromoRejectReason, string> = {
  invalid: "This code is not valid.",
  inactive: "This code is no longer available.",
  expired: "This code has expired.",
  min_order: "Your order doesn't meet the minimum for this code.",
  not_eligible_tier: "This code isn't available for your membership tier.",
  already_used: "You've already used this code.",
  max_uses_reached: "This code has reached its redemption limit.",
};

function reject(reason: PromoRejectReason): PromoEvaluation {
  return { ok: false, reason, message: REASON_MESSAGES[reason], discountKobo: 0 };
}

/** Raw discount a code yields on a subtotal, before any clamping to subtotal. */
export function rawDiscountKobo(code: PromoCode, subtotalKobo: number): number {
  if (code.discountType === "flat") {
    return Math.max(0, code.discountValue);
  }
  // percent
  const pct = Math.max(0, Math.min(100, code.discountValue));
  let d = Math.floor((subtotalKobo * pct) / 100);
  if (code.maxDiscountKobo != null && code.maxDiscountKobo >= 0) {
    d = Math.min(d, code.maxDiscountKobo);
  }
  return d;
}

export interface EvaluatePromoInput {
  code: PromoCode;
  subtotalKobo: number;
  tier: Tier;
  /** How many times this customer (user id or email) has already redeemed. */
  redemptionCount: number;
  now?: Date;
}

export function evaluatePromo(input: EvaluatePromoInput): PromoEvaluation {
  const { code, subtotalKobo, tier, redemptionCount } = input;
  const now = input.now ?? new Date();

  if (!code.active) return reject("inactive");
  if (code.expiresAt && new Date(code.expiresAt).getTime() <= now.getTime()) {
    return reject("expired");
  }
  if (code.maxUses != null && code.usesCount >= code.maxUses) {
    return reject("max_uses_reached");
  }
  if (redemptionCount >= code.perUserLimit) {
    return reject("already_used");
  }
  const eligible = code.eligibleTiers;
  if (eligible && eligible.length > 0 && !eligible.includes(tier)) {
    return reject("not_eligible_tier");
  }
  if (subtotalKobo < code.minOrderKobo) {
    return reject("min_order");
  }

  // Never discount more than the subtotal.
  const discountKobo = Math.min(rawDiscountKobo(code, subtotalKobo), subtotalKobo);
  if (discountKobo <= 0) return reject("invalid");

  return { ok: true, discountKobo };
}
