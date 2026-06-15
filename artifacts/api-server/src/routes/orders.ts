import { Router, type IRouter } from "express";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  transactionsTable,
  usersTable,
  type OrderLineItem,
} from "@workspace/db";
import { desc, eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { notifyOrderStatus } from "../lib/notify";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getTokenPayload } from "../lib/auth";

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

    const requestedDiscountNaira = Math.max(0, Math.floor(Number(body.discount ?? 0)));
    const discountNaira = Math.min(requestedDiscountNaira, subtotalNaira);
    const subtotalKobo = subtotalNaira * 100;
    const discountKobo = discountNaira * 100;
    const totalKobo = Math.max(subtotalKobo - discountKobo, 0);

    // Link the order to a customer account when the request carries a valid
    // user session token. Guest checkout (no/invalid token) leaves userId null.
    let userId: string | null = null;
    const payload = getTokenPayload(req.headers.authorization);
    if (payload?.sub) {
      const [u] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, payload.sub))
        .limit(1);
      if (u) userId = u.id;
    }

    // Write the order and its normalized line items atomically — a partial
    // failure must never leave an order persisted without its order_items.
    const order = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(ordersTable)
        .values({
          reference,
          userId,
          customerName: String(body.customerName ?? "").trim(),
          customerEmail: String(body.customerEmail ?? "").trim().toLowerCase(),
          customerPhone: String(body.customerPhone ?? "").trim(),
          deliveryAddress: String(body.deliveryAddress ?? "").trim(),
          deliveryCity: body.deliveryCity ? String(body.deliveryCity) : null,
          deliveryState: body.deliveryState ? String(body.deliveryState) : null,
          fulfillmentType,
          items,
          subtotalKobo,
          discountKobo,
          totalKobo,
          promoCode: body.promoCode ? String(body.promoCode) : null,
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

      return created;
    });

    return res.json({ order });
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
