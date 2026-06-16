// Loyalty & membership engine — single source of truth for tier thresholds and
// points math. Spec: earn 1 point per ₦100 spent; spend-based automatic tiers.
//
// All money is handled in kobo (₦1 = 100 kobo) to match the orders/users tables.

export type Tier = "bronze" | "silver" | "gold";

// Upper bound (inclusive, in kobo) of each tier's cumulative-spend band. Gold is
// open-ended. ₦50,000 = 5_000_000 kobo, ₦200,000 = 20_000_000 kobo.
const SILVER_MAX_KOBO = 20_000_000; // ₦200,000
const BRONZE_MAX_KOBO = 5_000_000; // ₦50,000

// 1 point per ₦100 spent → 1 point per 10,000 kobo.
const KOBO_PER_POINT = 10_000;

export interface TierMeta {
  tier: Tier;
  label: string;
  /** Cumulative spend (kobo) required to reach this tier. */
  minSpendKobo: number;
  benefits: string[];
}

// Ordered low → high. Benefits are cumulative per the spec (each tier includes
// the ones below it).
export const TIERS: TierMeta[] = [
  {
    tier: "bronze",
    label: "Bronze",
    minSpendKobo: 0,
    benefits: ["Early access to new arrivals 24hrs before the general public"],
  },
  {
    tier: "silver",
    label: "Silver",
    minSpendKobo: BRONZE_MAX_KOBO + 100, // ₦50,001
    benefits: [
      "Everything in Bronze",
      "Free delivery on all orders",
      "5% members pricing",
    ],
  },
  {
    tier: "gold",
    label: "Gold",
    minSpendKobo: SILVER_MAX_KOBO + 100, // ₦200,001
    benefits: [
      "Everything in Silver",
      "Exclusive curator picks every month",
      "Invitations to private tasting events",
      "Priority customer support",
    ],
  },
];

/** Resolve a cumulative-spend amount (kobo) to a tier. */
export function computeTier(totalSpendKobo: number): Tier {
  if (totalSpendKobo > SILVER_MAX_KOBO) return "gold";
  if (totalSpendKobo > BRONZE_MAX_KOBO) return "silver";
  return "bronze";
}

/** Points earned for an order total (kobo): 1 point per ₦100, floored. */
export function pointsForKobo(totalKobo: number): number {
  if (!Number.isFinite(totalKobo) || totalKobo <= 0) return 0;
  return Math.floor(totalKobo / KOBO_PER_POINT);
}

// --- Tier benefits applied to pricing -------------------------------------
// Silver & Gold members get 5% members pricing and free delivery; Bronze and
// guests get neither. These are enforced server-side so the client can never
// award itself a member discount.

/** Members pricing percentage for Silver/Gold. */
export const MEMBER_DISCOUNT_PERCENT = 5;

/**
 * Standard delivery fee (kobo) charged on delivery orders. Waived for pickup
 * and for Silver/Gold members (their free-delivery benefit). ₦2,500.
 */
export const DELIVERY_FEE_KOBO = 250_000;

/** True if the tier enjoys member pricing + free delivery. */
export function isMemberTier(tier: Tier): boolean {
  return tier === "silver" || tier === "gold";
}

/** Member (tier) pricing discount on a subtotal (kobo), floored. */
export function memberDiscountKobo(tier: Tier, subtotalKobo: number): number {
  if (!isMemberTier(tier) || subtotalKobo <= 0) return 0;
  return Math.floor((subtotalKobo * MEMBER_DISCOUNT_PERCENT) / 100);
}

/** Delivery fee (kobo) for an order: free for pickup or member tiers. */
export function deliveryFeeKobo(
  tier: Tier,
  fulfillmentType: "delivery" | "pickup",
): number {
  if (fulfillmentType === "pickup") return 0;
  if (isMemberTier(tier)) return 0;
  return DELIVERY_FEE_KOBO;
}
