import React, { createContext, useCallback, useContext, useMemo } from "react";

export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrder?: number;
  membersOnly: boolean;
  badge?: string;
  expiresAt?: string;
}

const OFFERS: Offer[] = [
  {
    id: "welcome10",
    code: "WELCOME10",
    title: "Welcome Bonus",
    description: "10% off your very first order — our gift to you.",
    discountType: "percent",
    discountValue: 10,
    membersOnly: true,
    badge: "New Member",
  },
  {
    id: "vip15",
    code: "VIP15",
    title: "VIP Members Discount",
    description: "Enjoy 15% off any order over ₦150,000.",
    discountType: "percent",
    discountValue: 15,
    minOrder: 150000,
    membersOnly: true,
    badge: "Members Only",
  },
  {
    id: "shayo5k",
    code: "SHAYO5K",
    title: "Loyalty Reward",
    description: "₦5,000 off when you spend ₦100,000 or more.",
    discountType: "fixed",
    discountValue: 5000,
    minOrder: 100000,
    membersOnly: true,
    badge: "Members Only",
  },
  {
    id: "asl2026",
    code: "ASL2026",
    title: "Festive Season Special",
    description: "20% off premium tequilas this season — limited time.",
    discountType: "percent",
    discountValue: 20,
    minOrder: 50000,
    membersOnly: true,
    badge: "Limited Time",
    expiresAt: "2026-12-31",
  },
  {
    id: "freeship",
    code: "ASLDELIVERS",
    title: "Free Lagos Delivery",
    description: "Complimentary delivery on any order — open to all.",
    discountType: "fixed",
    discountValue: 2500,
    membersOnly: false,
    badge: "Everyone",
  },
];

interface PromoResult {
  success: boolean;
  error?: string;
  offer?: Offer;
  discountAmount?: number;
}

interface OffersContextType {
  offers: Offer[];
  validatePromoCode: (
    code: string,
    orderTotal: number,
    isLoggedIn: boolean
  ) => PromoResult;
}

const OffersContext = createContext<OffersContextType | null>(null);

export function OffersProvider({ children }: { children: React.ReactNode }) {
  const offers = useMemo(() => OFFERS, []);

  const validatePromoCode = useCallback(
    (code: string, orderTotal: number, isLoggedIn: boolean): PromoResult => {
      const cleaned = code.trim().toUpperCase();
      if (!cleaned) return { success: false, error: "Enter a promo code" };

      const offer = offers.find((o) => o.code === cleaned);
      if (!offer) return { success: false, error: "Invalid promo code" };

      if (offer.membersOnly && !isLoggedIn) {
        return {
          success: false,
          error: "This code is for members only. Please sign up.",
        };
      }

      if (offer.minOrder && orderTotal < offer.minOrder) {
        return {
          success: false,
          error: `Minimum order ₦${offer.minOrder.toLocaleString("en-NG")} required`,
        };
      }

      if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
        return { success: false, error: "This code has expired" };
      }

      const discountAmount =
        offer.discountType === "percent"
          ? Math.round((orderTotal * offer.discountValue) / 100)
          : offer.discountValue;

      return { success: true, offer, discountAmount };
    },
    [offers]
  );

  return (
    <OffersContext.Provider value={{ offers, validatePromoCode }}>
      {children}
    </OffersContext.Provider>
  );
}

export function useOffers(): OffersContextType {
  const ctx = useContext(OffersContext);
  if (!ctx) throw new Error("useOffers must be used within OffersProvider");
  return ctx;
}
