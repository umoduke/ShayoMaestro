---
name: Expo object storage in this monorepo
description: How admin photo upload / object storage is wired across the api-server + Expo drinks-store, and why.
---

# Object storage (App Storage) for the Expo drinks-store

This monorepo has a **separate** Express `api-server` + Expo `drinks-store` (not the
single-server Expo layout the `expo_object_storage` blueprint assumes). So storage was
wired by hand rather than installing the blueprint:

- **Server**: use the *web* `object-storage` skill templates (`lib/objectStorage.ts`,
  `lib/objectAcl.ts`) — they target this api-server structure. The GCS client is
  sidecar-authenticated; do not modify it. One strict-TS fix needed: the
  `/object-storage/signed-object-url` `response.json()` is `unknown` → cast to
  `{ signed_url: string }`.
- **Provisioning**: `setupObjectStorage()` (idempotent) sets the bucket env vars. No
  integration `addIntegration`/`proposeIntegration` is required — provisioning is enough.
- **Client (Expo)**: presigned PUT differs per platform. Native uses
  `expo-file-system` `File` + `expo/fetch` (RN's plain fetch won't stream a file URI);
  web uses a `Blob`. `expo-file-system` must be added explicitly (not bundled).

**Why store a relative `servingPath` (e.g. `/api/storage/objects/uploads/<uuid>`) as the
product `imageUri`, not an absolute URL:** absolute URLs bake in the dev domain and break
in production. The image resolver prepends the right base at render time via `apiUrl()`.

**Why the public serve route is scoped:** presigned uploads land in `PRIVATE_OBJECT_DIR`,
so an unscoped public GET could expose anything written there. The route is restricted to
the `uploads/` prefix (no `..`) and to `image/*` content. Upload issuance is admin-only.
**How to apply:** if you ever store non-public objects in that dir, switch to ACL
enforcement (`canAccessObjectEntity`) instead of relying on prefix scoping.
