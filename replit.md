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
- **Name**: Sip & Chill
- **Preview**: `/`
- **State**: AsyncStorage (no backend, fully local)
- **Features**:
  - Home screen with featured banner, categories, search
  - Product listing with 12 drinks across 6 categories
  - Product detail page with size/quantity picker, ingredients
  - Shopping cart with quantity management
  - Checkout flow with delivery + payment form, order confirmation
  - User auth (sign up / login, stored locally)
  - Favorites (heart icon, persisted)
  - Order history with status tracking
- **Contexts**: CartContext, AuthContext, FavoritesContext, OrdersContext
- **Colors**: Sky blue (#0ea5e9) primary, orange (#f97316) accent — light + dark

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
