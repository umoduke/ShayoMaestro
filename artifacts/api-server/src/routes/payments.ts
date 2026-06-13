import { Router, type IRouter } from "express";
import { db, ordersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { paystackInitialize, paystackVerify } from "../lib/paystack";
import { logger } from "../lib/logger";
import { notifyOrderStatus } from "../lib/notify";

const router: IRouter = Router();

router.post("/payments/initialize", async (req, res) => {
  try {
    const orderId = String(req.body?.orderId ?? "");
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ error: "Order already paid" });
    }

    const reference = `${order.reference}-${Date.now()
      .toString(36)
      .toUpperCase()}`;

    const data = await paystackInitialize({
      email: order.customerEmail,
      amountKobo: order.totalKobo,
      reference,
      callbackUrl: req.body?.callbackUrl
        ? String(req.body.callbackUrl)
        : undefined,
      metadata: {
        order_id: order.id,
        order_reference: order.reference,
        customer_name: order.customerName,
      },
    });

    await db.insert(transactionsTable).values({
      orderId: order.id,
      reference: data.reference,
      provider: "paystack",
      amountKobo: order.totalKobo,
      currency: "NGN",
      status: "pending",
    });

    return res.json({
      authorizationUrl: data.authorization_url,
      reference: data.reference,
      orderId: order.id,
    });
  } catch (err) {
    logger.error({ err }, "Initialize payment failed");
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

router.get("/payments/verify/:reference", async (req, res) => {
  try {
    const reference = req.params.reference;
    const data = await paystackVerify(reference);

    const [tx] = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.reference, reference))
      .limit(1);

    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    let newStatus: "success" | "failed" | "pending" =
      data.status === "success"
        ? "success"
        : data.status === "failed"
        ? "failed"
        : "pending";

    if (newStatus === "success") {
      const amountMatches = Number(data.amount) === tx.amountKobo;
      const currencyMatches =
        !data.currency || String(data.currency).toUpperCase() === "NGN";
      const referenceMatches = data.reference === tx.reference;
      if (!amountMatches || !currencyMatches || !referenceMatches) {
        logger.warn(
          {
            expectedAmount: tx.amountKobo,
            paystackAmount: data.amount,
            expectedRef: tx.reference,
            paystackRef: data.reference,
            currency: data.currency,
          },
          "Paystack verify mismatch — refusing to mark paid"
        );
        newStatus = "failed";
      }
    }

    await db
      .update(transactionsTable)
      .set({
        status: newStatus,
        channel: data.channel ?? null,
        gatewayResponse: data.gateway_response ?? null,
        paidAt: data.paid_at ? new Date(data.paid_at) : null,
        rawPayload: data,
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, tx.id));

    if (newStatus === "success") {
      await db
        .update(ordersTable)
        .set({
          paymentStatus: "paid",
          fulfillmentStatus: "confirmed",
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, tx.orderId));
    } else if (newStatus === "failed") {
      await db
        .update(ordersTable)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(ordersTable.id, tx.orderId));
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, tx.orderId))
      .limit(1);

    // A successful payment auto-advances the order to "confirmed" — notify the
    // customer just like an admin-driven status change would.
    if (newStatus === "success" && order) {
      notifyOrderStatus(order, "confirmed");
    }

    return res.json({
      status: newStatus,
      order,
      paystack: {
        reference: data.reference,
        amount: data.amount,
        channel: data.channel,
        paidAt: data.paid_at,
        gatewayResponse: data.gateway_response,
      },
    });
  } catch (err) {
    logger.error({ err }, "Verify payment failed");
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

router.get("/payments/public-key", (_req, res) => {
  const key = process.env["PAYSTACK_PUBLIC_KEY"];
  if (!key) return res.status(500).json({ error: "Public key not configured" });
  return res.json({ publicKey: key });
});

export default router;
