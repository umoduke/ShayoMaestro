---
name: Drizzle push is interactive in this repo
description: Why schema constraints sometimes need manual SQL instead of drizzle push
---

# drizzle-kit push is interactive here

`pnpm --filter @workspace/db run push` opens an interactive TUI that does **not** accept piped/non-interactive input — it hangs or aborts when run from the agent shell.

**Workaround for simple, additive changes:** still edit the Drizzle schema (`lib/db/src/schema/*.ts`) so the source of truth is correct, then apply the equivalent SQL directly (e.g. via the `executeSql` callback) — e.g. `ALTER TABLE products ADD CONSTRAINT products_barcode_unique UNIQUE (barcode)`. Verify the constraint exists afterward.

**Why it matters:** keeps schema file and live DB in sync without a blocking TUI. For destructive/complex migrations, prefer a proper migration rather than ad-hoc SQL.
