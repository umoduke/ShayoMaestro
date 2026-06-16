import { Router, type IRouter } from "express";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  transactionsTable,
  usersTable,
  promoCodesTable,
  promoRedemptionsTable,
  type OrderLineItem,
} from "@workspace/db";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { notifyOrderStatus } from "../lib/notify";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getTokenPayload } from "../lib/auth";
import {
  computeTier,
  deliveryFeeKobo,
  memberDiscountKobo,
  type Tier,
} from "../lib/loyalty";
import { evaluatePromo } from "../lib/promoEngine";

const router: IRouter = Router();

router.post("/orders", async (req, res) => {
  try {
    const body = req.body ?? {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ error: "items required" });
    }

    const drinkIds: string[] = Array.from(
      new Set(
        rawItems
          .map((r: any) => String(r?.drinkId ?? r?.id ?? ""))
          .filter((s: string) => s.length > 0)
      )
    );
    const catalogRows = drinkIds.length
      ? await db
          .select()
          .from(productsTable)
          .where(inArray(productsTable.id, drinkIds))
      : [];
    const catalogById = new Map(catalogRows.map((p) => [p.id, p]));

    const items: OrderLineItem[] = [];
    let subtotalNaira = 0;
    for (const raw of rawItems) {
      const drinkId = String(raw?.drinkId ?? raw?.id ?? "");
      const sizeLabel = String(raw?.sizeLabel ?? raw?.size ?? "");
      const quantity = Math.max(1, Math.floor(Number(raw?.quantity ?? 1)));
      const product = catalogById.get(drinkId);
      const sizeRow = product?.sizes.find((s) => s.label === sizeLabel);
      if (!product || !sizeRow) {
        return res
          .status(400)
          .json({ error: `Invalid product: ${drinkId} / ${sizeLabel}` });
      }
      const unitPrice = sizeRow.price;
      subtotalNaira += unitPrice * quantity;
      items.push({
        drinkId,
        drinkName: product.name,
        sizeLabel,
        sizePrice: unitPrice,
        quantity,
        imageUrl: product.imageUri || undefined,
      });
    }

    const reference = `ASL-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const fulfillmentType =
      String(body.fulfillmentType ?? "delivery") === "pickup"
        ? "pickup"
        : "delivery";

    const subtotalKobo = subtotalNaira * 100;
    const customerEmail = String(body.customerEmail ?? "").trim().toLowerCase();

    // Resolve the customer's account + tier. The server is AUTHORITATIVE for
    // all pricing — the client's `discount` field is ignored entirely. Member
    // pricing (5% for Silver/Gold), the delivery fee, and any promo discount
    // are all recomputed here from trusted server state.
    let userId: string | null = null;
    let tier: Tier = "bronze";
    const payload = getTokenPayload(req.headers.authorization);
    if (payload?.sub) {
      const [u] = await db
        .select({ id: usersTable.id, totalSpendKobo: usersTable.totalSpendKobo })
        .from(usersTable)
        .where(eq(usersTable.id, payload.sub))
        .limit(1);
      if (u) {
        userId = u.id;
        tier = computeTier(u.totalSpendKobo);
      }
    }

    const baseMemberDiscount = memberDiscountKobo(tier, subtotalKobo);
    const delivery = deliveryFeeKobo(tier, fulfillmentType);
    const requestedPromoCode = body.promoCode
      ? String(body.promoCode).trim().toUpperCase()
      : "";

    // Write the order, its line items, and any promo redemption atomically — a
    // partial failure must never leave an order without items, nor a redemption
    // without its order. Promo claiming happens inside the tx so concurrent
    // checkouts cannot push a code past its usage limits.
    let promoNote: { applied: boolean; message: string | null } = {
      applied: false,
      message: null,
    };

    const order = await db.transaction(async (tx) => {
      let memberDiscount = baseMemberDiscount;
      let promoDiscount = 0;
      let promoCodeId: string | null = null;
      let promoCodeStr: string | null = null;

      if (requestedPromoCode) {
        // Lock the promo row for the duration of this transaction. Concurrent
        // checkouts redeeming the SAME code now serialize here, so the per-user
        // count-then-insert below cannot race two redemptions past
        // `perUserLimit` (and the global `maxUses` claim is likewise serialized).
        const [code] = await tx
          .select()
          .from(promoCodesTable)
          .where(eq(promoCodesTable.code, requestedPromoCode))
          .limit(1)
          .for("update");

        if (!code) {
          promoNote = { applied: false, message: "Promo code is not valid." };
        } else {
          // Count this customer's prior redemptions (by user id OR email).
          const idClauses = [];
          if (userId) idClauses.push(eq(promoRedemptionsTable.userId, userId));
          if (customerEmail)
            idClauses.push(eq(promoRedemptionsTable.email, customerEmail));
          let used = 0;
          if (idClauses.length > 0) {
            const [row] = await tx
              .select({ n: sql<number>`count(*)::int` })
              .from(promoRedemptionsTable)
              .where(
                and(
                  eq(promoRedemptionsTable.promoCodeId, code.id),
                  or(...idClauses),
                ),
              );
            used = row?.n ?? 0;
          }

          const ev = evaluatePromo({
            code,
            subtotalKobo,
            tier,
            redemptionCount: used,
          });

          // Decide whether the promo applies BEFORE claiming a usage slot, so
          // the stacking rule can't increment usesCount without a redemption.
          const willApply =
            ev.ok && (code.stackable || ev.discountKobo > memberDiscount);

          if (ev.ok && willApply) {
            // Atomically claim a global usage slot. If maxUses was hit by a
            // concurrent order, this returns no row and the promo is skipped.
            const claimed = await tx
              .update(promoCodesTable)
              .set({
                usesCount: sql`${promoCodesTable.usesCount} + 1`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(promoCodesTable.id, code.id),
                  eq(promoCodesTable.active, true),
                  sql`(${promoCodesTable.maxUses} is null or ${promoCodesTable.usesCount} < ${promoCodesTable.maxUses})`,
                ),
              )
              .returning({ id: promoCodesTable.id });

            if (claimed.length > 0) {
              promoDiscount = ev.discountKobo;
              promoCodeId = code.id;
              promoCodeStr = code.code;
              // Non-stackable winning promo replaces member pricing.
              if (!code.stackable) memberDiscount = 0;
              promoNote = { applied: true, message: null };
            } else {
              promoNote = {
                applied: false,
                message: "This code has reached its redemption limit.",
              };
            }
          } else {
            promoNote = {
              applied: false,
              message:
                ev.message ??
                "Promo code can't be combined with your member pricing.",
            };
          }
        }
      }

      // Clamp the combined discount so it never exceeds the subtotal.
      let totalDiscount = memberDiscount + promoDiscount;
      if (totalDiscount > subtotalKobo) {
        promoDiscount = Math.min(promoDiscount, subtotalKobo);
        memberDiscount = subtotalKobo - promoDiscount;
        totalDiscount = subtotalKobo;
      }
      const totalKobo = subtotalKobo - totalDiscount + delivery;

      const [created] = await tx
        .insert(ordersTable)
        .values({
          reference,
          userId,
          customerName: String(body.customerName ?? "").trim(),
          customerEmail,
          customerPhone: String(body.customerPhone ?? "").trim(),
          deliveryAddress: String(body.deliveryAddress ?? "").trim(),
          deliveryCity: body.deliveryCity ? String(body.deliveryCity) : null,
          deliveryState: body.deliveryState ? String(body.deliveryState) : null,
          fulfillmentType,
          items,
          subtotalKobo,
          discountKobo: promoDiscount,
          memberDiscountKobo: memberDiscount,
          deliveryFeeKobo: delivery,
          totalKobo,
          promoCode: promoCodeStr,
          promoCodeId,
          paymentMethod: String(body.paymentMethod ?? "paystack"),
          notes: body.notes ? String(body.notes) : null,
        })
        .returning();

      if (!created) {
        throw new Error("Order insert returned no row");
      }

      // Persist normalized line items (relational source of truth for
      // reporting), mirroring the denormalized JSONB copy stored on the order.
      await tx.insert(orderItemsTable).values(
        items.map((it) => ({
          orderId: created.id,
          productId: it.drinkId,
          drinkName: it.drinkName,
          sizeLabel: it.sizeLabel,
          quantity: it.quantity,
          unitPriceKobo: it.sizePrice * 100,
        }))
      );

      // Record the redemption now that the order exists. We already claimed the
      // usage slot above; this row is what enforces the per-user limit later.
      if (promoCodeId && promoDiscount > 0) {
        await tx.insert(promoRedemptionsTable).values({
          promoCodeId,
          userId,
          orderId: created.id,
          email: customerEmail || null,
          discountKobo: promoDiscount,
        });
      }

      return created;
    });

    return res.json({ order, promo: promoNote });
  } catch (err) {
    logger.error({ err }, "Failed to create order");
    return res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders", requireAdmin, async (_req, res) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt));
    return res.json({ orders });
  } catch (err) {
    logger.error({ err }, "Failed to list orders");
    return res.status(500).json({ error: "Failed to list orders" });
  }
});

router.get("/orders/:id", requireAdmin, async (req, res) => {
  try {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, String(req.params.id)))
      .limit(1);
    if (!order) return res.status(404).json({ error: "Not found" });
    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.orderId, order.id))
      .orderBy(desc(transactionsTable.createdAt));
    return res.json({ order, transactions });
  } catch (err) {
    logger.error({ err }, "Failed to fetch order");
    return res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.patch("/orders/:id", requireAdmin, async (req, res) => {
  try {
    // Read the current status first so we only notify on an actual change.
    const [current] = await db
      .select({ fulfillmentStatus: ordersTable.fulfillmentStatus })
      .from(ordersTable)
      .where(eq(ordersTable.id, String(req.params.id)))
      .limit(1);

    const updates: Partial<typeof ordersTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    const nextStatus = req.body?.fulfillmentStatus
      ? String(req.body.fulfillmentStatus)
      : undefined;
    if (nextStatus) updates.fulfillmentStatus = nextStatus;
    if (req.body?.notes !== undefined) updates.notes = req.body.notes;

    const [order] = await db
      .update(ordersTable)
      .set(updates)
      .where(eq(ordersTable.id, String(req.params.id)))
      .returning();
    if (!order) return res.status(404).json({ error: "Not found" });

    if (nextStatus && current && nextStatus !== current.fulfillmentStatus) {
      notifyOrderStatus(order, nextStatus);
    }
    return res.json({ order });
  } catch (err) {
    logger.error({ err }, "Failed to update order");
    return res.status(500).json({ error: "Failed to update order" });
  }
});

router.get("/transactions", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        transaction: transactionsTable,
        order: ordersTable,
      })
      .from(transactionsTable)
      .leftJoin(ordersTable, eq(transactionsTable.orderId, ordersTable.id))
      .orderBy(desc(transactionsTable.createdAt));
    return res.json({ transactions: rows });
  } catch (err) {
    logger.error({ err }, "Failed to list transactions");
    return res.status(500).json({ error: "Failed to list transactions" });
  }
});

export default router;
