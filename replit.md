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
  - `getProductImage(id, imageUri)` helper supports both local bundled images and remote URLs for admin-added products

### API Server (`artifacts/api-server`)
- Express 5 + TypeScript backend, port 8080
- Routes:
  - `GET /api/healthz`
  - `GET/POST/PATCH/DELETE /api/products` — single source of truth for catalog (DB-backed). Auto-seeded with the 4 default drinks on first server boot if `products` table is empty. Products include a nullable `barcode` column (captured via in-app camera scanning).
  - `GET /api/products/lookup/:barcode` — resolves a scanned EAN/UPC to product details for admin form prefill using the **free Open Food Facts** database (no API key). Returns `{found, source, product}` (partial: name/description/imageUri/origin/abv/category/tags). Category is keyword-guessed (whole-word match) into the app's `DrinkCategory`; ABV is regex-parsed from title/description. Returns `{found:false}` when the code isn't in the database. Rate-limited (60/min) to stay a polite OFF client (it's otherwise unauthenticated — MVP). **Provider history:** Open Food Facts covers mass-market drinks but few premium spirits (admin fills those manually). Paid providers were evaluated and declined: Barcode Lookup has broad spirits coverage but its Cloudflare layer hard-blocks this server's data-center IP (empty 403 for any key); Go-UPC is reachable server-side but its API is paid. `BARCODE_LOOKUP_API_KEY` is now unused.
  - `POST/GET/PATCH /api/orders` — server is **authoritative for pricing**: it ignores client subtotal and recomputes from the `products` table (any unknown drinkId/sizeLabel is rejected)
  - `GET /api/orders/:id`, `GET /api/transactions`
  - `POST /api/payments/initialize` — creates a Paystack transaction tied to an order and returns checkout URL
  - `GET /api/payments/verify/:reference` — verifies with Paystack, validates returned amount/currency/reference match stored transaction before marking order paid
  - `GET /api/payments/public-key`
- Postgres via Drizzle (`@workspace/db`): `orders` + `transactions` tables, kobo (NGN×100) integer amounts, GIG-ready customer/delivery fields
- Paystack TEST keys via `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY`
- ⚠️ Admin/order/transaction endpoints are **not auth-protected** — MVP only

### Mobile checkout flow
- Collects email, calls `POST /orders` (server prices the cart), then `POST /payments/initialize`, opens Paystack URL via `expo-web-browser`, calls `GET /payments/verify/:ref` on return, navigates to `/order/[id]`
- Admin Transactions screen (`/admin/transactions`) shows stats + per-tx audit details

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
