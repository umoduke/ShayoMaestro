import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAdmin } from "../middlewares/requireAdmin";

// Object storage (App Storage) routes for admin-uploaded product photos.
// Built on the Replit object-storage integration: the GCS client wrapper lives
// in lib/objectStorage.ts (sidecar-authenticated — do not modify).
//
// Flow: admin requests a presigned upload URL (admin-only), the device PUTs the
// image bytes directly to storage, then stores the returned `servingPath` as the
// product's imageUri. Catalog images are public, so the serve route is open.
const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /api/storage/upload  (admin only)
 *
 * Returns a presigned URL the client uploads the file bytes to directly, plus
 * the portable `servingPath` to persist as the product image.
 */
router.post(
  "/storage/upload",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      res.json({ uploadURL, objectPath, servingPath: `/api/storage${objectPath}` });
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
 * else in the private object dir, it is scoped two ways:
 *   1. Path must be under the `uploads/` product-image namespace (no traversal).
 *   2. Only image/* content is served; anything else returns 404.
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

    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
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
