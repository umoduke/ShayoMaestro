import { Router, type IRouter, type Request, type Response } from "express";
import { getStorageProvider, ObjectNotFoundError } from "../lib/storageProvider";
import { requireAdmin } from "../middlewares/requireAdmin";

// Object storage routes for admin-uploaded product photos.
// The backing store is environment-dependent (lib/storageProvider.ts):
//   - Replit object storage on DEV (GCS via sidecar)
//   - Azure Blob Storage on TST/PRD (AZURE_STORAGE_CONNECTION_STRING set)
//
// Flow: admin requests a presigned upload URL (admin-only), the device PUTs the
// image bytes directly to storage (including any provider-required
// uploadHeaders), then stores the returned `servingPath` as the product's
// imageUri. Catalog images are public, so the serve route is open.
const router: IRouter = Router();

/**
 * POST /api/storage/upload  (admin only)
 *
 * Returns a presigned URL the client uploads the file bytes to directly, plus
 * the portable `servingPath` to persist as the product image and any
 * `uploadHeaders` the PUT must include.
 */
router.post(
  "/storage/upload",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const target = await getStorageProvider().getUploadTarget();
      res.json(target);
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

/**
 * GET /api/storage/objects/*  (public)
 *
 * Serves uploaded product images. Catalog photos are not sensitive, so there is
 * no auth/ACL check here. To keep this open route from ever exposing anything
 * else, it is scoped two ways:
 *   1. Path must be under the `uploads/` product-image namespace (no traversal).
 *   2. Only image/* content is served; anything else returns 404 (enforced in
 *      the provider).
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = (req.params as Record<string, string | string[]>).path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

    if (
      !/^uploads\/[A-Za-z0-9._/-]+$/.test(wildcardPath) ||
      wildcardPath.includes("..")
    ) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const served = await getStorageProvider().serveObject(wildcardPath);

    res.status(200);
    res.setHeader("Content-Type", served.contentType);
    res.setHeader("Cache-Control", served.cacheControl);
    if (served.contentLength !== undefined) {
      res.setHeader("Content-Length", String(served.contentLength));
    }
    served.body.pipe(res);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
