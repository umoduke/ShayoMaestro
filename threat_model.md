# Threat Model

## Project Overview

This project is a publicly deployed e-commerce application for a premium drinks store. The production surface consists of an Express 5 API in `artifacts/api-server` and an Expo client in `artifacts/drinks-store` that talks directly to that API. The backend stores users, orders, transactions, products, and admin email allowlist entries in PostgreSQL via Drizzle, integrates with Paystack for payment initialization and verification, and serves uploaded product images from Replit object storage.

Production assumptions for this scan:
- The deployment is public at a `.replit.app` URL.
- Replit terminates TLS for client-to-server traffic.
- `NODE_ENV=production` in production.
- `artifacts/mockup-sandbox` is dev-only and out of scope unless production reachability is demonstrated.

## Assets

- **Admin capability** — the ability to manage products, orders, transactions, storage uploads, and the admin allowlist. Compromise gives an attacker operational control over the store.
- **Customer accounts and sessions** — user profile data, password hashes, session tokens, loyalty points, and tier state. Compromise enables impersonation and account takeover.
- **Order and transaction data** — names, emails, phone numbers, delivery addresses, order contents, payment status, and Paystack references. This is sensitive business and customer PII.
- **Application secrets** — `SESSION_SECRET`, `ADMIN_PASSWORD`, database credentials, Paystack secret key, and object-storage credentials. Compromise enables token forgery, admin impersonation, payment abuse, or full data access.
- **Catalog integrity** — product metadata, prices, sizes, and uploaded images. Tampering can enable fraud or reputational damage.

## Trust Boundaries

- **Client / API boundary** — the Expo app and any arbitrary internet client can call the public API. All client input is untrusted.
- **Authenticated customer / unauthenticated user boundary** — some flows are public (catalog, checkout creation, payment verify helpers), while profile and loyalty flows rely on bearer tokens.
- **Customer / admin boundary** — admin-only capabilities are enforced by bearer tokens plus admin-email checks. This boundary is especially sensitive because it governs product, order, transaction, and allowlist management.
- **API / database boundary** — the API has direct read/write access to all customer, order, and admin data.
- **API / external service boundary** — the backend calls Paystack and Open Food Facts; storage uploads also cross into object storage.
- **API / public object serving boundary** — uploaded files are stored privately but some are intentionally re-served over a public route.

## Scan Anchors

- **Production entry points**: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/drinks-store/lib/api.ts`, `artifacts/drinks-store/context/AuthContext.tsx`.
- **Highest-risk areas**: auth/token logic in `artifacts/api-server/src/lib/auth.ts`, admin gating in `artifacts/api-server/src/middlewares/requireAdmin.ts`, admin allowlist routes in `artifacts/api-server/src/routes/admins.ts`, account signup/login in `artifacts/api-server/src/routes/auth.ts`, payments in `artifacts/api-server/src/routes/payments.ts`, orders in `artifacts/api-server/src/routes/orders.ts`, storage exposure in `artifacts/api-server/src/routes/storage.ts`.
- **Public surfaces**: `/api/products`, `/api/products/lookup/:barcode`, `/api/orders` (POST), `/api/payments/*`, `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`, `/api/auth/profile`, `/api/admins/check/:email`, `/api/storage/objects/*`.
- **Admin surfaces**: `/api/products` mutation routes, `/api/orders` read/update routes, `/api/transactions`, `/api/admins`, `/api/storage/upload`.
- **Usually dev-only**: `artifacts/mockup-sandbox/**`, `artifacts/drinks-store/scripts/**`, generated `dist/**` bundles unless a source-level issue depends on them.

## Threat Categories

### Spoofing

This project relies on custom HMAC bearer tokens and email-based role checks rather than a managed auth system. The application must ensure that admin identity cannot be obtained merely by claiming an email address and that public auth endpoints resist credential stuffing and brute-force attacks. All protected routes MUST validate a signed token, and all transitions into admin capability MUST require proof of control over the claimed identity.

### Tampering

Customers and attackers can submit arbitrary cart contents, profile updates, uploaded image metadata, and payment-related parameters. The backend MUST remain authoritative for prices, order totals, and payment confirmation state, and MUST validate any user-controlled identifiers before mutating products, orders, or stored media references.

### Information Disclosure

The API stores and returns customer PII, order contents, transaction history, and loyalty data. Public endpoints and post-payment flows MUST not leak order or customer details to unauthorized callers. Logs, notifications, and public object-serving routes MUST avoid exposing secrets or sensitive non-image data.

### Denial of Service

Public login, signup, checkout, barcode lookup, and payment helper routes are reachable from the public internet. The application MUST rate-limit or otherwise constrain endpoints whose abuse could enable credential attacks, excessive third-party API usage, or cost-amplifying traffic patterns.

### Elevation of Privilege

The key privilege boundary is between ordinary customers and admins. Admin access MUST be enforced server-side based on trustworthy identity proof, not merely a mutable email string or frontend state. Account creation, login, and allowlist workflows MUST not permit attackers to self-promote into admin capability by racing a legitimate user or by abusing stale role assignments.
