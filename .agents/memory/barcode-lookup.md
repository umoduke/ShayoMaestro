---
name: Barcode -> product lookup
description: Resolving scanned retail barcodes to product details; provider quirks and category-matching pitfalls.
---

# Barcode -> product lookup (admin product-form prefill)

Server endpoint resolves a scanned EAN/UPC to product details: tries **Barcode Lookup**
(`api.barcodelookup.com/v3/products`) first, then falls back to the free **Open Food Facts**
(`world.openfoodfacts.org/api/v2`). Mobile fills only empty form fields so a scan never
clobbers in-progress admin edits.

## Coverage reality
- Open Food Facts has good coverage of mass-market packaged drinks (sodas, etc.) but **poor
  coverage of premium spirits** (Hennessy and similar are usually absent). That's why the
  dedicated paid service is the primary source — the free DB alone won't satisfy a liquor catalog.

## Barcode Lookup request quirks
- A request whose `key` query param contains slashes / a URL (e.g. someone pasted a repo URL as
  the API key) makes Cloudflare return an infinite **301 redirect to the same URL**. A clean but
  invalid key returns **HTTP 403**. So: 301-loop => malformed key value; 403 => wrong/inactive key.
- The endpoint IS reachable server-side from Replit with a clean key (403 proves reachability).

## Category guessing pitfall
**Match category keywords on whole words, not substrings.** Short keywords like `gin` and `rum`
match inside unrelated words ("ori**gin**al" -> gin, "sc**rum**" -> rum). Use `\bword\b` regex.
**Why:** substring matching mis-tagged Coca-Cola "Original Taste" as gin.
