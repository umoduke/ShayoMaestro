---
name: Expo Router screen reuse on same-route param change
description: Why a form/screen keeps stale values when you navigate to the same route with different params, and how to fix it.
---

Navigating to the **same route** with different params (e.g.
`router.replace('/admin/product-form?id=A')` while already on
`/admin/product-form?id=B`, or undefined -> some id) does **not** remount the
screen — Expo Router reuses the existing component instance.

Consequence: any state seeded via `useState(initialFromParams)` initializers runs
only once (on first mount), so the screen shows stale values after the param change.

**Fix:** add a `useEffect` keyed on the changing param that re-derives and sets all
state. Depend on the **param id only** — do NOT add the data-getter or the products
list to the deps, or a background refresh re-runs the effect and clobbers
in-progress edits. (Alternative: force a remount with a `key`, but the keyed-effect
is simpler here.)

**Why:** the duplicate-barcode "Edit existing" flow in the drinks-store admin
navigates to the same product-form route with a new id; without the effect the form
kept the previous product's values.

**How to apply:** any Expo Router screen that initializes form/edit state from route
params needs a param-keyed rehydrate effect, not just useState initializers.
