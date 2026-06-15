import { Router, type IRouter } from "express";
import { db, ordersTable, transactionsTable, usersTable } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";
import { paystackInitialize, paystackVerify } from "../lib/paystack";
import { logger } from "../lib/logger";
import { notifyOrderStatus, notifyLoyaltyEarned } from "../lib/notify";
import { computeTier, pointsForKobo } from "../lib/loyalty";

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

    // Capture the order state BEFORE mutating so re-verifications are idempotent
    // and can't regress an already-paid order (e.g. one already shipped).
    const [existingOrder] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, tx.orderId))
      .limit(1);
    const alreadyPaid = existingOrder?.paymentStatus === "paid";

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

    // Only mutate order state on the FIRST successful/failed verification.
    // Once an order is paid we never regress it (a later re-verify is a no-op).
    let didConfirm = false;
    // Loyalty award captured on the first paid transition. Idempotency is
    // enforced inside the DB transaction (conditional update + row lock), so
    // concurrent or repeated verifications can never double-accrue.
    let loyalty: { pointsEarned: number; upgradedTo: string | null } | null =
      null;
    if (newStatus === "success" && !alreadyPaid) {
      // Mark the order paid AND award loyalty in one transaction so a customer
      // is never left "paid but no points" (or vice versa).
      const result = await db.transaction(async (trx) => {
        // First-writer-wins: only flip the order if it is NOT already paid.
        // Concurrent verifiers block on this row's lock, then re-evaluate the
        // predicate against the just-committed "paid" row and match 0 rows —
        // so exactly one verifier proceeds to accrue points.
        const confirmedRows = await trx
          .update(ordersTable)
          .set({
            paymentStatus: "paid",
            fulfillmentStatus: "confirmed",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(ordersTable.id, tx.orderId),
              ne(ordersTable.paymentStatus, "paid")
            )
          )
          .returning({ id: ordersTable.id });

        if (confirmedRows.length === 0) {
          // Lost the race — another verifier already confirmed and accrued.
          return { confirmed: false, loyalty: null };
        }

        if (!existingOrder?.userId) {
          return { confirmed: true, loyalty: null };
        }

        // Lock the user row so two orders confirming for the same user at once
        // can't lose an update to points/spend/tier (read-modify-write).
        const [u] = await trx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, existingOrder.userId))
          .for("update")
          .limit(1);
        if (!u) return { confirmed: true, loyalty: null };

        const pointsEarned = pointsForKobo(existingOrder.totalKobo);
        const newSpend = u.totalSpendKobo + existingOrder.totalKobo;
        const newTier = computeTier(newSpend);
        await trx
          .update(usersTable)
          .set({
            points: u.points + pointsEarned,
            totalSpendKobo: newSpend,
            tier: newTier,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, u.id));

        return {
          confirmed: true,
          loyalty: {
            pointsEarned,
            upgradedTo: newTier !== u.tier ? newTier : null,
          },
        };
      });
      didConfirm = result.confirmed;
      loyalty = result.loyalty;
    } else if (newStatus === "failed" && !alreadyPaid) {
      // Never regress a paid order to failed (guard against a stale/racing
      // verify): only transition while still unpaid.
      await db
        .update(ordersTable)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(
          and(
            eq(ordersTable.id, tx.orderId),
            ne(ordersTable.paymentStatus, "paid")
          )
        );
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, tx.orderId))
      .limit(1);

    // A successful payment auto-advances the order to "confirmed" — notify the
    // customer once, only on the actual transition (not on repeat verifies).
    if (didConfirm && order) {
      notifyOrderStatus(order, "confirmed");
      if (loyalty && (loyalty.pointsEarned > 0 || loyalty.upgradedTo)) {
        notifyLoyaltyEarned(order, loyalty.pointsEarned, {
          upgradedTo: loyalty.upgradedTo,
        });
      }
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
