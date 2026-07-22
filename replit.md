# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Drinks Store Mobile App (`artifacts/drinks-store`)
- **Type**: Expo (React Native) — iOS & Android
- **Brand**: Authentic Shayo Lockerr (ASL) — premium Nigerian spirits retailer
- **Website**: https://authenticshayolockerr.com
- **Preview**: `/`
- **State**: AsyncStorage (no backend, fully local)
- **Features**:
  - Home screen: ASL logo header, hero banner, featured horizontal row, category pills, product grid
  - Product listing: 4 premium tequilas (Casamigos Blanco ₦116k, Casamigos Reposado ₦123.25k, Clase Azul Añejo ₦362.5k, Clase Azul Reposado ₦362.5k)
  - Product detail: full bottle image, origin/ABV, tasting notes, size/quantity picker, authenticity badge, Add to Cart
  - Shopping cart with quantity management, Naira pricing
  - Checkout flow: name/phone/address, Nigerian payment methods (Bank Transfer, Card, USSD, Pay on Delivery), order confirmation
  - User auth (sign up / login, stored locally)
  - Favorites (heart icon, persisted)
  - Order history with status tracking
  - Profile → Preferences: working **Appearance** (theme: System/Light/Dark) and **Notifications** (per-type toggles) settings, persisted via `SettingsContext` (AsyncStorage). `useColors` and `useEffectiveScheme` resolve the active palette from the theme preference; `SettingsProvider` wraps the whole app (above `ErrorBoundary`).
- **Product Images**: AI-generated bottle photography in `assets/images/` (casamigos-blanco.png, casamigos-reposado.png, clase-azul-anejo.png, clase-azul-reposado.png)
- **Logo**: AI-generated ASL brand logo in `assets/images/asl-logo.png`
- **Contexts**: CartContext, AuthContext, FavoritesContext, OrdersContext, ProductsContext
- **Theme**: Dark luxury gold — dark bg `#0d0b08`, gold primary `#d4a843`, cream bg (light: `#fdf8f0`)
- **Catalog**: 32 products across Tequila, Whiskey, and Bourbon categories (Naira pricing). Casamigos Blanco ₦112,350, Casamigos Reposado ₦118,600. `DrinkCategory` includes a `bourbon` category; the user's "Whiskies" list maps to `whiskey`. Note: Johnnie Walker Blue Label is filed under `tequila` because that is where the user listed it (editable via admin panel).
- **Admin System**:
  - Super-admin credentials: `admin@asl.com` / `ASLadmin2026` (granted admin only via password; never via the allowlist)
  - Admin flag `isAdmin: boolean` on `User` type in AuthContext
  - **Promote-to-admin**: server-backed allowlist (`admin_emails` table + `/api/admins` routes). Admin Panel → "Manage Admins" (`/admin/admins`) lets an admin add/remove other accounts by email. AuthContext re-checks the allowlist on login/signup and on app mount, so promotions/removals take effect next time that account opens the app. The super-admin email is permanent and cannot be removed.
  - Admin Panel accessible from Profile screen when logged in as admin
  - Admin Dashboard: stats (products, orders, revenue, pending), quick actions, recent orders
  - Product Management (`/admin/products`): list all products with edit/delete, FAB to add new
  - Product Form (`/admin/product-form`): add or edit product — name, category, price, description, image URL, origin, ABV, tags, colors, **barcode/QR**
  - **Barcode / QR scanning** (`components/BarcodeScanner.tsx`, `expo-camera`): "Scan Barcode / QR Code" button on the product form opens a full-screen camera. Scanning a plain barcode/QR captures the code into the `barcode` field and warns on duplicates (offers to edit the existing product). Scanning a QR that contains a JSON product payload (`{name, category, price, description, ...}`) auto-fills the whole form — for store-generated restock labels. Camera permission requested on demand; web shows a manual-entry fallback. Scanner has a **torch/flashlight toggle**, a trimmed barcode-type set (qr/ean13/ean8/upc/code128/datamatrix) for faster locking, and surfaces camera mount errors. Products carry a nullable `barcode` field end-to-end (DB → API → mobile).
  - **Auto-fill from barcode**: scanning a plain retail barcode calls `GET /api/products/lookup/:barcode` (free Open Food Facts) and pre-fills the *empty* form fields (name, description, image, origin, ABV, category, tags) from manufacturer data. Fills via functional state updaters so an in-flight lookup never overwrites a field the admin just typed; category (which has a non-empty default) is only auto-set when untouched and on a new product (`categoryTouched` ref). Non-numeric scans (text QR) skip the lookup and just save the code. Price is always left for the admin (Naira). A spinner shows while looking up; alerts report which fields were filled and the source, or that nothing was found (common for premium spirits — fill those manually).
  - Order Management (`/admin/orders`): filter by status, expand order to see items/address/payment, update status (processing/confirmed/shipped/delivered/cancelled), remove order
  - ProductsContext: now backed by the API (`/api/products`) — admin add/edit/delete persists to PostgreSQL and is shared across all clients. Falls back to bundled `DRINKS` defaults only if the API is unreachable.
  - `getProductImage(id, imageUri)` helper supports local bundled images, remote URLs, and uploaded-photo serving paths. A `imageUri` beginning with `/` (e.g. `/api/storage/objects/uploads/<uuid>`) is resolved to an absolute URL via `apiUrl()` so native `Image` can load it; full `http(s)` URLs pass through unchanged.
  - **Device photo upload** (App Storage / object storage): the product form has an "Upload Photo" button (`expo-image-picker`) alongside the manual Image URL field. `uploadProductImage()` in `lib/api.ts` (1) requests an admin-only presigned URL from `POST /api/storage/upload`, (2) PUTs the bytes directly to GCS (native: `expo-file-system` `File` + `expo/fetch`; web: `Blob`), then stores the returned **relative** `servingPath` as `imageUri` (portable across dev/prod). Permission handling + uploading spinner included.

### Promo codes & tier pricing (server-authoritative)
- **Pricing is computed entirely server-side** in `POST /orders` — the client's `discount` field is ignored. The server rebuilds the subtotal from DB product prices, then applies: member discount (5% off subtotal for Silver/Gold via `lib/loyalty.ts` `memberDiscountKobo`), a delivery fee (`DELIVERY_FEE_KOBO` = ₦2,500, charged on **delivery** orders, **waived for pickup and for Silver/Gold members** via `deliveryFeeKobo`), and a validated promo discount. Formula: `total = subtotal − (memberDiscount + promoDiscount) + deliveryFee`, with the combined discount clamped to the subtotal. Order rows store the full breakdown (`discountKobo` = promo only, `memberDiscountKobo`, `deliveryFeeKobo`, `promoCodeId`).
- **Stacking rule:** stackable codes SUM with member pricing; non-stackable codes take `max(memberDiscount, promoDiscount)` (always customer-favourable) — if a non-stackable promo wins, member discount is zeroed. The client checkout preview (`drinks-store/lib/pricing.ts` `computePreview`) mirrors this math exactly, but is **advisory only**: checkout uses the server's returned `order.totalKobo` and shows the server's `promo.applied`/`promo.message`.
- **Promo schema** (`lib/db/src/schema/promos.ts`): `promo_codes` (code, type, discountType percent|flat, discountValue [percent number or flat **kobo**], minOrderKobo, maxDiscountKobo cap for percent, expiresAt, maxUses, usesCount, perUserLimit, eligibleTiers[], stackable, active) + `promo_redemptions` (promoCodeId, userId, orderId, email, discountKobo).
- **Atomic redemption:** redemption is recorded at ORDER CREATION inside the order transaction. The promo row is locked with `SELECT … FOR UPDATE` so concurrent checkouts of the same code serialize — this is what makes the per-user `count-then-insert` race-safe (a plain conditional `usesCount` increment only guards the **global** `maxUses`, not `perUserLimit`). Tradeoff: an abandoned unpaid order consumes a single-use code (fails closed / safe). Verified with a 6-way parallel test: exactly one redemption.
- **Promo routes** (`routes/promos.ts`): `POST /promos/validate` (public, rate-limited `promoValidateLimiter` 60/15min — gives the checkout a live preview without an order); admin-token CRUD `GET/POST/PATCH/DELETE /promos`; `GET /promos/:id` analytics. Validation reasons: invalid/inactive/expired/min_order/not_eligible_tier/already_used/max_uses_reached.
- **Admin UI:** Admin Panel → "Promo Codes" (`/admin/promos`) lists codes with status (active/inactive/expired/used-up), uses/limits, pause/activate/delete; `/admin/promo-form` creates/edits rules (flat amounts entered in Naira → stored kobo; percent stored as-is).

### API Server (`artifacts/api-server`)
- Express 5 + TypeScript backend, port 8080
- Routes:
  - `GET /api/healthz`
  - `GET/POST/PATCH/DELETE /api/products` — single source of truth for catalog (DB-backed). Auto-seeded with the 4 default drinks on first server boot if `products` table is empty. Products include a nullable `barcode` column (captured via in-app camera scanning).
  - `GET /api/products/lookup/:barcode` — resolves a scanned EAN/UPC to product details for admin form prefill using the **free Open Food Facts** database (no API key). Returns `{found, source, product}` (partial: name/description/imageUri/origin/abv/category/tags). Category is keyword-guessed (whole-word match) into the app's `DrinkCategory`; ABV is regex-parsed from title/description. Returns `{found:false}` when the code isn't in the database. Rate-limited (60/min) to stay a polite OFF client (it's otherwise unauthenticated — MVP). **Provider history:** Open Food Facts covers mass-market drinks but few premium spirits (admin fills those manually). Paid providers were evaluated and declined: Barcode Lookup has broad spirits coverage but its Cloudflare layer hard-blocks this server's data-center IP (empty 403 for any key); Go-UPC is reachable server-side but its API is paid. `BARCODE_LOOKUP_API_KEY` is now unused.
  - `POST/GET/PATCH /api/orders` — server is **authoritative for pricing**: it ignores client subtotal and recomputes from the `products` table (any unknown drinkId/sizeLabel is rejected)
  - `GET /api/orders/:id`, `GET /api/transactions` (admin-token protected — they return customer PII)
  - `POST /api/auth/admin-login` — super-admin login, returns an HMAC bearer token
  - `POST /api/payments/initialize` — creates a Paystack transaction tied to an order and returns checkout URL
  - `GET /api/payments/verify/:reference` — verifies with Paystack, validates returned amount/currency/reference match stored transaction before marking order paid
  - `GET /api/payments/public-key`
  - `POST /api/storage/upload` (**admin-token protected**) — returns a presigned GCS upload URL + a portable relative `servingPath` for admin product-photo uploads (App Storage / object storage). Server files `lib/objectStorage.ts` + `lib/objectAcl.ts` are the Replit object-storage templates (sidecar-authenticated GCS client — do not modify; one strict-TS cast was added on the signed-URL response). Provisioned via `setupObjectStorage()`; uses `DEFAULT_OBJECT_STORAGE_BUCKET_ID` / `PRIVATE_OBJECT_DIR` / `PUBLIC_OBJECT_SEARCH_PATHS`.
  - `GET /api/storage/objects/*` (**public**) — serves uploaded product images. Hardened so this open route can only expose product photos: path is scoped to the `uploads/` prefix (no `..` traversal) and only `image/*` content is served (anything else → 404). Catalog images are non-sensitive and UUID-named.
- Postgres via Drizzle (`@workspace/db`): `orders` + `transactions` tables, kobo (NGN×100) integer amounts, GIG-ready customer/delivery fields
- Paystack TEST keys via `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY`
- **Auth (added for launch)**: dependency-free HMAC bearer tokens (Node `crypto`, signed with `SESSION_SECRET`, 7-day expiry, constant-time compare). `lib/auth.ts` mints/verifies tokens; `middlewares/requireAdmin.ts` guards routes and re-checks admin membership on every request (so removed admins lose access before token expiry). `POST /api/auth/admin-login` issues a token to the **super-admin only** (verifies `email === admin@asl.com` against `ADMIN_PASSWORD` env var — no longer hardcoded in the app).
  - **Protected (require admin token):** products POST/PATCH/DELETE; orders GET `/orders`, GET `/orders/:id`, PATCH `/orders/:id`; GET `/transactions`; admins GET/POST/DELETE.
  - **Public (customer flow):** GET `/products`, `/products/lookup/:barcode`, POST `/orders`, payments/*, GET `/admins/check/:email`, `/healthz`.
  - **Known limitation:** only the super-admin obtains a server token; allowlisted admins (`admin_emails`) can authenticate in-app but have no server password, so they cannot get a backend token. Acceptable for a single-owner store with an empty allowlist. Future: add `SESSION_SECRET_PREVIOUS` for zero-downtime secret rotation.
- Paystack is on **TEST** keys — switch `PAYSTACK_SECRET_KEY`/`PAYSTACK_PUBLIC_KEY` to LIVE before real sales (user action).

### Mobile checkout flow
- Collects email, calls `POST /orders` (server prices the cart), then `POST /payments/initialize`, opens Paystack URL via `expo-web-browser`, calls `GET /payments/verify/:ref` on return, navigates to `/order/[id]`
- Admin Transactions screen (`/admin/transactions`) shows stats + per-tx audit details

## Environments (DEV / TST / PRD)

- **DEV** = this Replit workspace (dev DB, Paystack TEST keys).
- **TST / PRD** = Azure App Service (Linux containers). Full kit in `deploy/azure/`:
  - `deploy/azure/Dockerfile` — multi-stage pnpm build of the API server (uses `pnpm deploy --legacy` to prune; dist bundle + node_modules for esbuild externals).
  - `deploy/azure/provision.sh <tst|prd>` — az CLI provisioning: resource group, shared ACR, App Service (HTTPS-only, health check `/api/healthz`, managed-identity ACR pull), PostgreSQL Flexible Server (public access locked to the web app's outbound IPs only), Log Analytics + Application Insights, email metric alerts (5xx, response time, health).
  - `.github/workflows/deploy-{tst,prd}.yml` — push to `tst`/`prd` branch → `az acr build` → drizzle push → deploy container → smoke test. PRD targets a GitHub `production` environment (add required reviewers for manual approval).
  - `deploy/azure/README.md` — full setup checklist (GitHub secrets, remaining app settings, Expo `EXPO_PUBLIC_API_URL` per env).
- **Monitoring hook**: `src/index.ts` starts Application Insights BEFORE dynamically importing `./main` (so express/pg get patched) — only when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set; a no-op on Replit. `applicationinsights` is an esbuild external.
- **Known Azure gap**: Replit object storage (admin photo upload + `/api/storage/*`) doesn't work off-Replit; port to Azure Blob Storage if needed (documented in the README).

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
