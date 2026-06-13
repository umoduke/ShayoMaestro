import { Router, type IRouter } from "express";
import { db, productsTable, type ProductSize } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// Postgres unique-violation error code, raised when two products share a barcode.
function isDuplicateBarcodeError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

function sanitizeSizes(input: unknown): ProductSize[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input
    .map((s: any) => ({
      label: String(s?.label ?? "").trim(),
      price: Math.max(0, Math.floor(Number(s?.price ?? 0))),
    }))
    .filter((s) => {
      if (s.label.length === 0 || s.price <= 0) return false;
      // Drop duplicate labels — cart identity and order pricing both key on
      // (drinkId, sizeLabel), so duplicate labels would charge the wrong variant.
      const key = s.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeBody(body: any) {
  const sizes = sanitizeSizes(body?.sizes);
  const price =
    sizes.length > 0
      ? sizes[0]!.price
      : Math.max(0, Math.floor(Number(body?.price ?? 0)));
  return {
    name: String(body?.name ?? "").trim(),
    shortName: String(body?.shortName ?? body?.name ?? "").trim(),
    category: String(body?.category ?? "all").trim(),
    price,
    currency: String(body?.currency ?? "\u20A6"),
    rating: Number(body?.rating ?? 0),
    reviewCount: Math.floor(Number(body?.reviewCount ?? 0)),
    description: String(body?.description ?? ""),
    shortDescription: String(body?.shortDescription ?? ""),
    ingredients: Array.isArray(body?.ingredients)
      ? body.ingredients.map((x: unknown) => String(x))
      : [],
    sizes,
    imageUri: String(body?.imageUri ?? ""),
    imageColor: String(body?.imageColor ?? "#1a1a1a"),
    accentColor: String(body?.accentColor ?? "#ff6b35"),
    featured: Boolean(body?.featured ?? false),
    tags: Array.isArray(body?.tags)
      ? body.tags.map((x: unknown) => String(x))
      : [],
    origin: body?.origin ? String(body.origin) : null,
    abv: body?.abv ? String(body.abv) : null,
    barcode: body?.barcode ? String(body.barcode).trim() : null,
  };
}

// --- Barcode -> manufacturer product lookup -------------------------------
// Resolves a scanned retail barcode (EAN/UPC) to product details so the admin
// form can be pre-filled. Uses only the free Open Food Facts database (no API
// key, nothing to pay for). It has good coverage of mass-market drinks but
// little for premium spirits, which the admin fills in manually.
//
// Why not a paid provider: Barcode Lookup (broad spirits coverage) is hard-
// blocked by Cloudflare for this server's data-center IP (empty 403 for any
// key); Go-UPC is reachable but its API is paid. The store opted to stay on
// the free source rather than take on a second subscription.

type LookupResult = {
  name: string;
  description: string | null;
  imageUri: string | null;
  origin: string | null;
  abv: string | null;
  category: string | null;
  tags: string[];
};

const CATEGORY_KEYWORDS: { cat: string; words: string[] }[] = [
  { cat: "tequila", words: ["tequila", "mezcal", "agave"] },
  { cat: "bourbon", words: ["bourbon"] },
  { cat: "whiskey", words: ["whiskey", "whisky", "scotch", "rye"] },
  { cat: "rum", words: ["rum", "rhum", "cachaca", "cachaça"] },
  { cat: "gin", words: ["gin"] },
  { cat: "vodka", words: ["vodka"] },
  {
    cat: "wine",
    words: [
      "wine",
      "champagne",
      "prosecco",
      "merlot",
      "cabernet",
      "chardonnay",
      "sauvignon",
      "rosé",
      "rose wine",
    ],
  },
];

function guessCategory(...parts: (string | null | undefined)[]): string | null {
  const hay = parts.filter(Boolean).join(" ").toLowerCase();
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    // Whole-word match only — substring matching would wrongly tag e.g.
    // "Original Taste" as gin ("ori-gin-al") or "scrum" as rum.
    if (words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(hay))) return cat;
  }
  return null;
}

function parseAbv(...parts: (string | null | undefined)[]): string | null {
  const hay = parts.filter(Boolean).join(" ");
  const m = hay.match(/(\d{1,2}(?:\.\d)?)\s*%/);
  return m ? `${m[1]}%` : null;
}

async function lookupOpenFoodFacts(
  barcode: string,
): Promise<LookupResult | null> {
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
    `?fields=product_name,brands,generic_name,categories,countries,image_url,quantity`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ASL-DrinksStore/1.0 (admin barcode lookup)" },
  });
  if (!res.ok) return null;
  const data: any = await res.json().catch(() => null);
  if (data?.status !== 1 || !data?.product) return null;
  const pr = data.product;
  const name = String(pr.product_name ?? "").trim();
  if (!name) return null;
  const tags = String(pr.brands ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  return {
    name,
    description: pr.generic_name ? String(pr.generic_name).trim() : null,
    imageUri: pr.image_url ? String(pr.image_url) : null,
    origin: pr.countries
      ? String(pr.countries).split(",")[0]!.trim() || null
      : null,
    abv: parseAbv(name, pr.generic_name, pr.quantity, pr.categories),
    category: guessCategory(name, pr.categories, pr.generic_name),
    tags,
  };
}

// Lightweight in-memory rate limit. This route fans out to a third-party API
// on every call, so it's shielded from runaway/abusive traffic (it's otherwise
// unauthenticated, like the rest of this MVP) — both to be a polite Open Food
// Facts client and to avoid getting this server's IP throttled. Behind the
// shared proxy most requests share an IP, so this acts as a global cap too.
const LOOKUP_WINDOW_MS = 60_000;
const LOOKUP_MAX = 60;
const lookupHits = new Map<string, { count: number; resetAt: number }>();

function lookupRateLimited(ip: string): boolean {
  const now = Date.now();
  for (const [k, v] of lookupHits) {
    if (now > v.resetAt) lookupHits.delete(k);
  }
  const entry = lookupHits.get(ip);
  if (!entry || now > entry.resetAt) {
    lookupHits.set(ip, { count: 1, resetAt: now + LOOKUP_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LOOKUP_MAX;
}

router.get("/products/lookup/:barcode", async (req, res) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  if (lookupRateLimited(ip)) {
    return res
      .status(429)
      .json({ error: "Too many lookups, please slow down" });
  }
  const barcode = String(req.params.barcode ?? "").trim();
  if (!/^[0-9]{6,14}$/.test(barcode)) {
    return res.status(400).json({ error: "Invalid barcode" });
  }
  try {
    const result = await lookupOpenFoodFacts(barcode).catch((err) => {
      logger.warn({ err }, "Open Food Facts request failed");
      return null;
    });
    if (!result) {
      return res.json({ found: false, source: null, product: null });
    }
    return res.json({ found: true, source: "openfoodfacts", product: result });
  } catch (err) {
    logger.error({ err }, "Barcode lookup failed");
    return res.status(500).json({ error: "Lookup failed" });
  }
});

router.get("/products", async (_req, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .orderBy(asc(productsTable.sortOrder), asc(productsTable.createdAt));
    return res.json({ products });
  } catch (err) {
    logger.error({ err }, "Failed to list products");
    return res.status(500).json({ error: "Failed to list products" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, String(req.params.id)))
      .limit(1);
    if (!product) return res.status(404).json({ error: "Not found" });
    return res.json({ product });
  } catch (err) {
    logger.error({ err }, "Failed to fetch product");
    return res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/products", requireAdmin, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (!data.name || data.sizes.length === 0) {
      return res.status(400).json({ error: "name and sizes required" });
    }
    const id =
      "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const [product] = await db
      .insert(productsTable)
      .values({ id, ...data })
      .returning();
    return res.json({ product });
  } catch (err) {
    if (isDuplicateBarcodeError(err)) {
      return res.status(409).json({
        error: "Another product already uses this barcode",
      });
    }
    logger.error({ err }, "Failed to create product");
    return res.status(500).json({ error: "Failed to create product" });
  }
});

router.patch("/products/:id", requireAdmin, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (!data.name || data.sizes.length === 0) {
      return res.status(400).json({ error: "name and sizes required" });
    }
    const [product] = await db
      .update(productsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productsTable.id, String(req.params.id)))
      .returning();
    if (!product) return res.status(404).json({ error: "Not found" });
    return res.json({ product });
  } catch (err) {
    if (isDuplicateBarcodeError(err)) {
      return res.status(409).json({
        error: "Another product already uses this barcode",
      });
    }
    logger.error({ err }, "Failed to update product");
    return res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(productsTable)
      .where(eq(productsTable.id, String(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete product");
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
