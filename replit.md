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
- **Product Images**: AI-generated bottle photography in `assets/images/` (casamigos-blanco.png, casamigos-reposado.png, clase-azul-anejo.png, clase-azul-reposado.png)
- **Logo**: AI-generated ASL brand logo in `assets/images/asl-logo.png`
- **Contexts**: CartContext, AuthContext, FavoritesContext, OrdersContext, ProductsContext
- **Theme**: Dark luxury gold — dark bg `#0d0b08`, gold primary `#d4a843`, cream bg (light: `#fdf8f0`)
- **Admin System**:
  - Credentials: `admin@asl.com` / `ASLadmin2026`
  - Admin flag `isAdmin: boolean` on `User` type in AuthContext
  - Admin Panel accessible from Profile screen when logged in as admin
  - Admin Dashboard: stats (products, orders, revenue, pending), quick actions, recent orders
  - Product Management (`/admin/products`): list all products with edit/delete, FAB to add new
  - Product Form (`/admin/product-form`): add or edit product — name, category, price, description, image URL, origin, ABV, tags, colors
  - Order Management (`/admin/orders`): filter by status, expand order to see items/address/payment, update status (processing/confirmed/shipped/delivered/cancelled), remove order
  - ProductsContext: now backed by the API (`/api/products`) — admin add/edit/delete persists to PostgreSQL and is shared across all clients. Falls back to bundled `DRINKS` defaults only if the API is unreachable.
  - `getProductImage(id, imageUri)` helper supports both local bundled images and remote URLs for admin-added products

### API Server (`artifacts/api-server`)
- Express 5 + TypeScript backend, port 8080
- Routes:
  - `GET /api/healthz`
  - `GET/POST/PATCH/DELETE /api/products` — single source of truth for catalog (DB-backed). Auto-seeded with the 4 default drinks on first server boot if `products` table is empty.
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
