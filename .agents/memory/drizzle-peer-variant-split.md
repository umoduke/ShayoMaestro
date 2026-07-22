---
name: Drizzle peer-variant split after adding otel-dependent packages
description: Adding a package that pulls @opentelemetry/api can split drizzle-orm into two peer variants, collapsing row types to {}.
---

# Adding an otel-dependent package can split drizzle-orm into two peer variants

Installing a package that depends on `@opentelemetry/api` (e.g.
`applicationinsights`) makes pnpm re-resolve `drizzle-orm` with that optional
peer satisfied, producing a SECOND variant hash
(`drizzle-orm@X_@opentelemetry+api@...`). If the `@workspace/db` lib's
node_modules symlink still points at the old variant while the api-server gets
the new one, typechecking breaks with weird symptoms: row types collapse to
`{}`, transaction callbacks become implicit `any` (TS7006/TS2339).

**Why:** two structurally different copies of drizzle's types are in play; the
lib's emitted declarations reference one instance, the consumer another.

**How to apply:** after `pnpm add` of anything otel-adjacent, if drizzle types
suddenly degrade, check `readlink */node_modules/drizzle-orm` across packages.
Fix = plain `pnpm install --frozen-lockfile` at root (re-syncs symlinks to the
lockfile's unified variant) + `pnpm run typecheck:libs`. Not a code problem —
don't start adding annotations/casts.
