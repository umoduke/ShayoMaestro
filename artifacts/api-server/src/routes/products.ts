import { Router, type IRouter } from "express";
import { db, productsTable, type ProductSize } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function sanitizeSizes(input: unknown): ProductSize[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s: any) => ({
      label: String(s?.label ?? "").trim(),
      price: Math.max(0, Math.floor(Number(s?.price ?? 0))),
    }))
    .filter((s) => s.label.length > 0 && s.price > 0);
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
// form can be pre-filled. Primary source is Barcode Lookup (broad coverage
// including spirits/liquor); falls back to the free Open Food Facts database.

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

async function lookupBarcodeLookup(
  barcode: string,
): Promise<LookupResult | null> {
  const key = process.env.BARCODE_LOOKUP_API_KEY;
  if (!key) return null;
  const url =
    `https://api.barcodelookup.com/v3/products?barcode=${encodeURIComponent(barcode)}` +
    `&formatted=y&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data: any = await res.json().catch(() => null);
  const p = data?.products?.[0];
  const name = String(p?.title ?? "").trim();
  if (!name) return null;
  const tags = [p.brand, p.manufacturer]
    .map((x: unknown) => String(x ?? "").trim())
    .filter(Boolean);
  return {
    name,
    description: p.description ? String(p.description).trim() : null,
    imageUri:
      Array.isArray(p.images) && p.images[0] ? String(p.images[0]) : null,
    origin: null,
    abv: parseAbv(name, p.description),
    category: guessCategory(name, p.category, p.description),
    tags: Array.from(new Set(tags)),
  };
}

async function lookupOpenFoodFacts(
  barcode: string,
): Promise<LookupResult | null> {
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
    `?fields=product_name,brands,generic_name,categories,countries,image_url`;
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
    abv: null,
    category: guessCategory(name, pr.categories, pr.generic_name),
    tags,
  };
}

// Lightweight in-memory rate limit. Unlike basic CRUD, this route calls a
// paid third-party API, so it must be shielded from runaway/abusive traffic
// (it's otherwise unauthenticated, like the rest of this MVP). Behind the
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
    let source: "barcodelookup" | "openfoodfacts" | null = "barcodelookup";
    let result = await lookupBarcodeLookup(barcode).catch((err) => {
      logger.warn({ err }, "Barcode Lookup request failed");
      return null;
    });
    if (!result) {
      source = "openfoodfacts";
      result = await lookupOpenFoodFacts(barcode).catch((err) => {
        logger.warn({ err }, "Open Food Facts request failed");
        return null;
      });
    }
    if (!result) {
      return res.json({ found: false, source: null, product: null });
    }
    return res.json({ found: true, source, product: result });
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
    res.json({ products });
  } catch (err) {
    logger.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Failed to list products" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, req.params.id))
      .limit(1);
    if (!product) return res.status(404).json({ error: "Not found" });
    res.json({ product });
  } catch (err) {
    logger.error({ err }, "Failed to fetch product");
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/products", async (req, res) => {
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
    res.json({ product });
  } catch (err) {
    logger.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.patch("/products/:id", async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (!data.name || data.sizes.length === 0) {
      return res.status(400).json({ error: "name and sizes required" });
    }
    const [product] = await db
      .update(productsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productsTable.id, req.params.id))
      .returning();
    if (!product) return res.status(404).json({ error: "Not found" });
    res.json({ product });
  } catch (err) {
    logger.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const [deleted] = await db
      .delete(productsTable)
      .where(eq(productsTable.id, req.params.id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
