---
name: Order dual representation (JSONB + normalized order_items)
description: Why each order is written twice and the transactional rule binding them.
---

Each order persists its line items in TWO places: the denormalized JSONB `items`
column on `orders`, AND normalized rows in `order_items` (one per line). Both are
written in the same `POST /orders` handler.

**Rule:** the order row and its `order_items` rows must be inserted inside a single
`db.transaction(...)`. A partial write that leaves an order without its line items
violates the normalized source-of-truth guarantee used for reporting/loyalty.

**Why:** the JSONB copy keeps the customer-facing order self-contained and cheap to
render; the normalized `order_items` table is the relational source of truth for
analytics, loyalty points, and per-product reporting. They can drift if not written
atomically.

**How to apply:** any future change to order creation (new fields, promo handling,
loyalty point accrual) must keep both representations consistent and stay inside the
transaction. `orders.userId` is nullable (guest checkout) and set only when a valid
user session token (`sub`) is present; `order_items.orderId` cascades on delete.
