---
name: API server admin auth model
description: How admin authorization works on the drinks-store API and why it's shaped this way
---

# Admin auth (drinks-store API server)

The Express API uses **dependency-free HMAC bearer tokens** (Node `crypto`, no JWT lib) signed with the existing `SESSION_SECRET`. Token = `base64url(JSON{email,exp}) + "." + base64url(HMAC-SHA256(body))`. Verified with a constant-time compare; 7-day expiry.

**Why dependency-free:** avoids adding a JWT dependency for a single-token use case; `SESSION_SECRET` already existed.

**Authorization rule:** `requireAdmin` middleware re-checks admin membership (`isAdminEmail`) on *every* request, not just at login — so removing an admin from the `admin_emails` allowlist revokes access before the 7-day token expires.

**Super-admin only gets a server token.** `POST /api/auth/admin-login` verifies `email === admin@asl.com` against the `ADMIN_PASSWORD` env var (moved off the mobile app, where it used to be hardcoded). Allowlisted admins can flag as admin in-app but have **no server password**, so they cannot obtain a backend token. Accepted because it's a single-owner store with an empty allowlist.

**Endpoint exposure decision:** customer-facing reads/writes stay public (GET /products, POST /orders, payments/*, /admins/check). Anything returning customer PII or mutating catalog/orders is admin-protected — including `GET /orders/:id` and `GET /orders`, which leak name/email/phone/address. Note `api.getOrder` exists in the mobile client lib but is **never called** (the order screen reads local `OrdersContext`), so protecting `/orders/:id` had zero client impact.

**Future:** support `SESSION_SECRET_PREVIOUS` so rotating `SESSION_SECRET` doesn't force-logout every admin.
