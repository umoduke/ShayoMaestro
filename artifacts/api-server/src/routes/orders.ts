import { Router, type IRouter } from "express";
import { db, ordersTable, transactionsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { lookupPrice } from "../lib/catalog";

const router: IRouter = Router();

router.post("/orders", async (req, res) => {
  try {
    const body = req.body ?? {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ error: "items required" });
    }

    const items: Array<Record<string, unknown>> = [];
    let subtotalNaira = 0;
    for (const raw of rawItems) {
      const drinkId = String(raw?.drinkId ?? raw?.id ?? "");
      const sizeLabel = String(raw?.sizeLabel ?? raw?.size ?? "");
      const quantity = Math.max(1, Math.floor(Number(raw?.quantity ?? 1)));
      const unitPrice = lookupPrice(drinkId, sizeLabel);
      if (unitPrice == null) {
        return res
          .status(400)
          .json({ error: `Invalid product: ${drinkId} / ${sizeLabel}` });
      }
      subtotalNaira += unitPrice * quantity;
      items.push({
        drinkId,
        name: raw?.name ?? null,
        sizeLabel,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      });
    }

    const reference = `ASL-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const requestedDiscountNaira = Math.max(0, Math.floor(Number(body.discount ?? 0)));
    const discountNaira = Math.min(requestedDiscountNaira, subtotalNaira);
    const subtotalKobo = subtotalNaira * 100;
    const discountKobo = discountNaira * 100;
    const totalKobo = Math.max(subtotalKobo - discountKobo, 0);

    const [order] = await db
      .insert(ordersTable)
      .values({
        reference,
        customerName: String(body.customerName ?? "").trim(),
        customerEmail: String(body.customerEmail ?? "").trim().toLowerCase(),
        customerPhone: String(body.customerPhone ?? "").trim(),
        deliveryAddress: String(body.deliveryAddress ?? "").trim(),
        deliveryCity: body.deliveryCity ? String(body.deliveryCity) : null,
        deliveryState: body.deliveryState ? String(body.deliveryState) : null,
        items,
        subtotalKobo,
        discountKobo,
        totalKobo,
        promoCode: body.promoCode ? String(body.promoCode) : null,
        paymentMethod: String(body.paymentMethod ?? "paystack"),
        notes: body.notes ? String(body.notes) : null,
      })
      .returning();

    res.json({ order });
  } catch (err) {
    logger.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders", async (_req, res) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt));
    res.json({ orders });
  } catch (err) {
    logger.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Failed to list orders" });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, req.params.id))
      .limit(1);
    if (!order) return res.status(404).json({ error: "Not found" });
    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.orderId, order.id))
      .orderBy(desc(transactionsTable.createdAt));
    res.json({ order, transactions });
  } catch (err) {
    logger.error({ err }, "Failed to fetch order");
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.patch("/orders/:id", async (req, res) => {
  try {
    const updates: Partial<typeof ordersTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (req.body?.fulfillmentStatus)
      updates.fulfillmentStatus = String(req.body.fulfillmentStatus);
    if (req.body?.notes !== undefined) updates.notes = req.body.notes;

    const [order] = await db
      .update(ordersTable)
      .set(updates)
      .where(eq(ordersTable.id, req.params.id))
      .returning();
    if (!order) return res.status(404).json({ error: "Not found" });
    res.json({ order });
  } catch (err) {
    logger.error({ err }, "Failed to update order");
    res.status(500).json({ error: "Failed to update order" });
  }
});

router.get("/transactions", async (_req, res) => {
  try {
    const rows = await db
      .select({
        transaction: transactionsTable,
        order: ordersTable,
      })
      .from(transactionsTable)
      .leftJoin(ordersTable, eq(transactionsTable.orderId, ordersTable.id))
      .orderBy(desc(transactionsTable.createdAt));
    res.json({ transactions: rows });
  } catch (err) {
    logger.error({ err }, "Failed to list transactions");
    res.status(500).json({ error: "Failed to list transactions" });
  }
});

export default router;
