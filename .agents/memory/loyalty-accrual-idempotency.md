---
name: Loyalty accrual idempotency (payment verify)
description: Why point/spend/tier accrual on payment confirm must use a conditional UPDATE + row lock, not a pre-read guard.
---

# Loyalty accrual must be idempotent against concurrent payment verifies

`GET /payments/verify/:reference` can be called multiple times for one reference
(user returns from Paystack browser, retries, double-taps) and even concurrently.
Loyalty accrual (points + cumulative spend + tier recompute on the user row) fires
on the **first** paid transition of the order.

**Rule:** Never gate the once-only accrual on a value read *before* the transaction
(e.g. `alreadyPaid = order.paymentStatus === "paid"` read outside the trx). Two
concurrent verifies both read "unpaid" and both accrue → double points.

**How to apply:** Inside one `db.transaction`, transition the order with a
conditional update and check affected rows:
`UPDATE orders SET payment_status='paid', ... WHERE id=? AND payment_status != 'paid'`
then `.returning({id})`. If the returned array is empty, another verifier already
won the race — return without accruing. This is first-writer-wins: the second
verifier blocks on the row lock, re-evaluates the predicate against the committed
"paid" row, and matches 0 rows.

Additionally `SELECT ... FOR UPDATE` (`.for("update")` in Drizzle) the **user** row
before its read-modify-write, so two *different* orders confirming for the same user
at once can't lose a points/spend update.

**Why:** A pre-transaction read is a classic check-then-act TOCTOU race; only a
conditional write evaluated under the row lock is atomic. Caught in Phase 2
architect review.
