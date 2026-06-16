// Client-side mirror of the server's authoritative pricing (see api-server
// lib/loyalty.ts + the POST /orders handler). Used to PREVIEW totals at
// checkout. The server always recomputes and is the source of truth — this is
// purely for display so the customer sees the breakdown before placing the
// order.

export const MEMBER_DISCOUNT_PERCENT = 5;
export const DELIVERY_FEE_KOBO = 250_000; // ₦2,500

export function isMemberTier(tier: string | null | undefined): boolean {
  return tier === "silver" || tier === "gold";
}

export interface PreviewPromo {
  code: string;
  discountKobo: number;
  stackable: boolean;
}

export interface PricingPreview {
  subtotalKobo: number;
  memberDiscountKobo: number;
  promoDiscountKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
}

export function computePreview(input: {
  subtotalKobo: number;
  tier: string | null | undefined;
  fulfillmentType: "delivery" | "pickup";
  promo: PreviewPromo | null;
}): PricingPreview {
  const { subtotalKobo, tier, fulfillmentType, promo } = input;
  const member = isMemberTier(tier);

  let memberDiscountKobo = member
    ? Math.floor((subtotalKobo * MEMBER_DISCOUNT_PERCENT) / 100)
    : 0;
  const deliveryFeeKobo =
    fulfillmentType === "pickup" || member ? 0 : DELIVERY_FEE_KOBO;

  let promoDiscountKobo = 0;
  if (promo && promo.discountKobo > 0) {
    const willApply = promo.stackable || promo.discountKobo > memberDiscountKobo;
    if (willApply) {
      promoDiscountKobo = promo.discountKobo;
      if (!promo.stackable) memberDiscountKobo = 0;
    }
  }

  let totalDiscount = memberDiscountKobo + promoDiscountKobo;
  if (totalDiscount > subtotalKobo) {
    promoDiscountKobo = Math.min(promoDiscountKobo, subtotalKobo);
    memberDiscountKobo = subtotalKobo - promoDiscountKobo;
    totalDiscount = subtotalKobo;
  }

  return {
    subtotalKobo,
    memberDiscountKobo,
    promoDiscountKobo,
    deliveryFeeKobo,
    totalKobo: subtotalKobo - totalDiscount + deliveryFeeKobo,
  };
}
