---
name: Auth token scheme (single HMAC, user vs admin)
description: How customer and admin sessions share one token scheme without privilege leakage.
---

There is ONE HMAC bearer-token scheme (signed with `SESSION_SECRET`). Both customer
and admin sessions use it; they differ only by payload and gate.

- **Customer tokens** carry `sub` (the users-table UUID). Issued by `/auth/signup`
  and `/auth/login`. Used by `/auth/me`, `/auth/profile`, and to link orders.
- **Admin access** is NOT granted by token contents. Admin routes gate on
  `requireAdmin` → `isAdminEmail`, so an ordinary user token can never pass an admin
  gate even though it's the same token format.
- **Super-admin** (store owner) authenticates via the separate `/auth/admin-login`
  (password in `ADMIN_PASSWORD` env). It has NO row in the users table — do not route
  it through `/auth/login` or call `/auth/me` for it. The mobile `AuthContext`
  special-cases `admin@asl.com` and skips the `me()` re-sync for it.

**Why:** keeps one signing/verifying path while preventing privilege escalation; the
admin allowlist can change server-side and is re-checked per request, so removed
admins lose access before token expiry.

**Login timing:** failed logins for non-existent emails verify against a module-level
`DUMMY_PASSWORD_HASH` (computed once) so timing doesn't reveal whether an email exists.
