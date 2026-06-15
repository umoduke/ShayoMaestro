// Client-side mirror of the server loyalty rules (artifacts/api-server/src/lib/loyalty.ts).
// Used to render the Members dashboard (tier, points, progress to next tier).
// The server remains authoritative for actual point/tier accrual.

export type Tier = "bronze" | "silver" | "gold";

const BRONZE_MAX_KOBO = 5_000_000; // ₦50,000
const SILVER_MAX_KOBO = 20_000_000; // ₦200,000

export interface TierMeta {
  tier: Tier;
  label: string;
  minSpendKobo: number;
  color: string;
  benefits: string[];
}

// Ordered low → high. Benefits are cumulative per the spec.
export const TIERS: TierMeta[] = [
  {
    tier: "bronze",
    label: "Bronze",
    minSpendKobo: 0,
    color: "#a9743b",
    benefits: ["Early access to new arrivals 24hrs before the general public"],
  },
  {
    tier: "silver",
    label: "Silver",
    minSpendKobo: BRONZE_MAX_KOBO + 100,
    color: "#9aa3ad",
    benefits: [
      "Everything in Bronze",
      "Free delivery on all orders",
      "5% members pricing",
    ],
  },
  {
    tier: "gold",
    label: "Gold",
    minSpendKobo: SILVER_MAX_KOBO + 100,
    color: "#d4a843",
    benefits: [
      "Everything in Silver",
      "Exclusive curator picks every month",
      "Invitations to private tasting events",
      "Priority customer support",
    ],
  },
];

export function computeTier(totalSpendKobo: number): Tier {
  if (totalSpendKobo > SILVER_MAX_KOBO) return "gold";
  if (totalSpendKobo > BRONZE_MAX_KOBO) return "silver";
  return "bronze";
}

export function tierMeta(tier: string): TierMeta {
  return TIERS.find((t) => t.tier === tier) ?? TIERS[0];
}

export interface TierProgress {
  current: TierMeta;
  next: TierMeta | null;
  /** 0–1 progress toward the next tier (1 when already at the top tier). */
  progress: number;
  /** Cumulative spend (kobo) still needed to reach the next tier (0 at top). */
  remainingKobo: number;
}

/**
 * Progress of a cumulative-spend amount toward the next tier. Returns a full
 * bar with no "next" tier once the customer is Gold.
 */
export function tierProgress(totalSpendKobo: number): TierProgress {
  const spend = Math.max(0, totalSpendKobo);
  const current = tierMeta(computeTier(spend));
  const idx = TIERS.findIndex((t) => t.tier === current.tier);
  const next = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;

  if (!next) {
    return { current, next: null, progress: 1, remainingKobo: 0 };
  }

  const floor = current.minSpendKobo;
  const ceil = next.minSpendKobo;
  const span = Math.max(1, ceil - floor);
  const progress = Math.min(1, Math.max(0, (spend - floor) / span));
  return {
    current,
    next,
    progress,
    remainingKobo: Math.max(0, ceil - spend),
  };
}

export function formatNairaFromKobo(kobo: number): string {
  return "₦" + Math.round(kobo / 100).toLocaleString("en-NG");
}
