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
- **Contexts**: CartContext, AuthContext, FavoritesContext, OrdersContext
- **Theme**: Dark luxury gold — dark bg `#0d0b08`, gold primary `#d4a843`, cream bg (light: `#fdf8f0`)

### API Server (`artifacts/api-server`)
- Express 5 + TypeScript backend
- Health check route at `/api/healthz`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
