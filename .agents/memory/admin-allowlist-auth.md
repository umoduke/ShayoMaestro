---
name: Admin allowlist auth pitfall
description: How the drinks-store hybrid auth (local AsyncStorage users + server admin allowlist) must treat the super-admin to avoid privilege escalation.
---

The drinks-store mobile app has no central user table — users live only in per-device
AsyncStorage. Admin status comes from two sources:
1. A hardcoded super-admin (`admin@asl.com`) granted admin ONLY when the correct
   password is supplied at login.
2. A server-side allowlist (`admin_emails` table, `/api/admins`) for promoting other
   accounts, checked via `GET /api/admins/check/:email`.

**Rule:** Never run the allowlist check (`isAllowlistedAdmin`) for the super-admin email
in the login or signup path. The check endpoint reports `admin@asl.com` as admin *by
identity* (no password), so OR-ing it into the login decision means any 6+ char password
unlocks admin. Always gate the super-admin purely on the password match, and only fall
through to the allowlist for `email !== ADMIN_EMAIL`.

**Why:** A code review caught that `isSuperAdmin || isAllowlistedAdmin(email)` granted
admin to anyone typing `admin@asl.com` with a wrong password.

**How to apply:** Any future change to AuthContext login/signup/mount re-sync must keep
the `email !== ADMIN_EMAIL` guard before calling the allowlist. All `/api/admins`
endpoints are intentionally unauthenticated (MVP), consistent with the other routes — the
real protection is the client-side password gate, so don't weaken it.
