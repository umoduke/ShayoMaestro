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
