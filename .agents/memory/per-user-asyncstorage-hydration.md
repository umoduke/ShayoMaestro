---
name: Per-user AsyncStorage hydration race
description: How to switch a React context's persisted state between accounts without clobbering or losing writes.
---

When a context persists per-user state to AsyncStorage and re-keys on login/logout
(key like `..._<userId|guest>`), the async hydration window creates two races:

1. **Clobber on switch** — the persist effect runs synchronously on the userId
   change and would write the *previous* user's in-memory state under the *new*
   user's key before the new key has loaded.
   **Fix:** gate persistence behind a `hydratedKey` ref set to `null` at the start
   of each load and only set to the key after `getItem` resolves; the persist
   effect early-returns while `hydratedKey.current !== key`.

2. **Event loss during hydration** — an item added after the load starts but
   before it resolves is overwritten by `setNotifications(parsed)`.
   **Fix:** buffer adds in a `pendingAdds` ref while `hydratedKey.current === null`
   and merge `[...pendingAdds, ...parsed]` when the load resolves.

**Why:** flagged by architect review on the loyalty notifications inbox; low
likelihood but real, and the same pattern applies to any per-user context here.

**How to apply:** use this whenever a context's storage key depends on the
signed-in user. Note: FavoritesContext currently uses a single *global* key, so
favorites are shared across accounts on a device — re-key it the same way if
per-user favorites are ever wanted.
