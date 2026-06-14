---
name: Order status-change notifications
description: How customer notifications are tied to order fulfillmentStatus transitions, and the idempotency rule any status-advancing path must follow.
---

# Order status-change notifications

`notifyOrderStatus(order, status)` (api-server `lib/notify.ts`) is fire-and-forget: it never throws and isolates each channel (email via Resend, WhatsApp via Meta WhatsApp Business). Customers should be notified once on **every real status change**, never on a no-op re-trigger.

## The transition rule (do not break)
Any code path that advances an order's `fulfillmentStatus` must fire the notification **only on the actual transition**, and must never regress an already-progressed order.

- Admin `PATCH /orders/:id`: read current status first, only notify when it actually changes.
- Payment `GET /payments/verify/:reference`: this endpoint is hit repeatedly (Paystack callback + client retries). It must be **idempotent** — read the order's `paymentStatus` *before* mutating, and only set `paid`+`confirmed` (and notify "confirmed") when it wasn't already `paid`. Otherwise a re-verify resends "confirmed" and can drag an already-shipped/delivered order back to `confirmed`.

**Why:** payment verify and any future webhook are inherently retried/duplicated; without a before-state guard you get duplicate customer messages and status regression.

**How to apply:** when adding a new auto-advance path (webhook, cron, bulk action), fetch existing state, compute `didTransition`, gate both the DB write and the notify on it.

## Provider wiring status
`sendEmail`/`sendWhatsApp` are graceful NO-OP stubs (log "skipped — not configured yet") until credentials exist. Email needs `RESEND_API_KEY`; WhatsApp needs Meta WhatsApp Business (heavy: business verification + approved templates). Filling the stubs requires no trigger changes — the wiring is already complete.
