# Memory index

- [API server admin auth](api-server-admin-auth.md) — HMAC bearer tokens (SESSION_SECRET), super-admin-only login, requireAdmin re-checks allowlist each request; which routes are public vs protected.
- [Drizzle push is interactive](drizzle-push-interactive.md) — `db run push` TUI won't take piped input; edit schema then apply additive constraints via direct SQL.
- [Admin allowlist auth pitfall](admin-allowlist-auth.md) — hybrid local-user + server-allowlist auth must special-case the super-admin to avoid privilege escalation.
- [RN keyboard dismiss per keystroke](rn-input-remount.md) — why a TextInput loses focus after every character in this Expo app, and the fix.
- [Barcode → product lookup](barcode-lookup.md) — resolving scanned retail barcodes to product details; provider reachability and category-matching pitfalls.
- [Expo Router screen reuse](expo-router-param-rehydrate.md) — form keeps stale values when navigating to the same route with new params; how to fix.
