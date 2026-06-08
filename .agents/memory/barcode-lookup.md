---
name: Barcode -> product lookup
description: Resolving scanned retail barcodes to product details; provider reachability and category-matching pitfalls.
---

# Barcode -> product lookup (admin product-form prefill)

Server endpoint resolves a scanned EAN/UPC to product details. **Final design: free
Open Food Facts only** (`world.openfoodfacts.org/api/v2`), no API key. Mobile fills only
empty form fields (via functional state updaters) so a scan never clobbers in-progress
admin edits.

## Coverage reality
- Open Food Facts has good coverage of mass-market packaged drinks (sodas, beer, etc.) but
  **poor coverage of premium spirits** (Hennessy, Casamigos, Clase Azul are usually absent).
  The admin fills those in manually. No free database evaluated (OFF, UPCitemdb trial,
  Brocade) carries premium spirits.

## Provider reachability (the key lesson)
- **Barcode Lookup (`api.barcodelookup.com`) is hard-blocked by Cloudflare from Replit's
  data-center IP.** Real key, fake key, and no key all return an *identical empty HTTP 403*
  with `server: cloudflare`. It is unusable server-side from here regardless of key — it is
  NOT a wrong-key problem. (A residential/mobile IP, e.g. the phone itself, would pass.)
- Go-UPC, Barcode Spider, UPCDatabase.org, EAN-Search ARE reachable server-side but all need
  paid keys. The store declined paid providers.
- **Why the final choice:** user wanted no new subscription and nothing sensitive leaving the
  server, so the endpoint stays on free OFF + manual entry for spirits.

## Category guessing pitfall
**Match category keywords on whole words, not substrings.** Short keywords like `gin` and `rum`
match inside unrelated words ("ori**gin**al" -> gin, "sc**rum**" -> rum). Use `\bword\b` regex.
**Why:** substring matching mis-tagged Coca-Cola "Original Taste" as gin.

## Misc
- `BARCODE_LOOKUP_API_KEY` secret exists but is now **unused** (provider abandoned).
- Lookup route is rate-limited (60/min, in-memory) to stay a polite OFF client; the route is
  otherwise unauthenticated (MVP).
- Lookup only runs for numeric scans (`/^[0-9]{6,14}$/`); text/JSON QR payloads skip it.
