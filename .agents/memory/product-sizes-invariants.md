---
name: Product size invariants
description: Rules for product `sizes` in the drinks-store — label uniqueness and how headline price is derived.
---

# Product size invariants

- **Size labels must be unique per product (case-insensitive).**
  **Why:** cart line identity is keyed on `(drinkId, sizeLabel)` and order pricing looks up the size by label (`sizes.find(s => s.label === sizeLabel)`). Duplicate labels collapse cart lines and can charge the wrong variant. Product-detail size chips are also keyed by label (React key collisions).
  **How to apply:** any code that creates/edits sizes must reject duplicate labels. Enforced in the admin product form validation AND server-side in `sanitizeSizes` (drops later duplicates) — keep both.

- **A product's headline/card `price` is derived from `sizes[0].price`.**
  **Why:** the server's `normalizeBody` sets `price = sizes[0].price` when sizes exist, ignoring any separately-submitted top-level price. The admin form's "Base price" field is just the default the first size inherits when its own price is left blank.
  **How to apply:** keep the first size = the intended headline size. When building optimistic local product copies, set `price = finalSizes[0].price` so client and server agree.
