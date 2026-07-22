import { Readable } from "stream";
import { randomUUID } from "crypto";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export { ObjectNotFoundError };

/**
 * Storage provider abstraction so product-photo uploads work in every
 * environment:
 *   - DEV (Replit): Replit object storage (GCS via sidecar) — the existing
 *     ObjectStorageService, selected when no Azure connection string is set.
 *   - TST/PRD (Azure): Azure Blob Storage, selected when
 *     AZURE_STORAGE_CONNECTION_STRING is set.
 *
 * The serving paths are identical in both cases
 * (`/api/storage/objects/uploads/<uuid>`), so imageUri values stay portable.
 */

export interface UploadTarget {
  uploadURL: string;
  /** Portable path to persist as the product imageUri. */
  servingPath: string;
  /** Extra headers the client MUST send on the PUT (Azure needs x-ms-blob-type). */
  uploadHeaders?: Record<string, string>;
}

export interface ServedObject {
  contentType: string;
  contentLength?: number;
  cacheControl: string;
  body: Readable;
}

export interface StorageProvider {
  getUploadTarget(): Promise<UploadTarget>;
  /** @param objectKey e.g. "uploads/<uuid>" (already validated by the route). */
  serveObject(objectKey: string): Promise<ServedObject>;
}

// ---------------------------------------------------------------------------
// Replit (DEV) provider — wraps the existing sidecar-authenticated GCS service.
// ---------------------------------------------------------------------------

class ReplitStorageProvider implements StorageProvider {
  private svc = new ObjectStorageService();

  async getUploadTarget(): Promise<UploadTarget> {
    const uploadURL = await this.svc.getObjectEntityUploadURL();
    const objectPath = this.svc.normalizeObjectEntityPath(uploadURL);
    return { uploadURL, servingPath: `/api/storage${objectPath}` };
  }

  async serveObject(objectKey: string): Promise<ServedObject> {
    const file = await this.svc.getObjectEntityFile(`/objects/${objectKey}`);
    const response = await this.svc.downloadObject(file);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new ObjectNotFoundError();
    }
    if (!response.body) {
      throw new ObjectNotFoundError();
    }
    const lengthHeader = response.headers.get("content-length");
    return {
      contentType,
      contentLength: lengthHeader ? Number(lengthHeader) : undefined,
      cacheControl: response.headers.get("cache-control") ?? "public, max-age=3600",
      body: Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
    };
  }
}

// ---------------------------------------------------------------------------
// Azure Blob (TST/PRD) provider.
// ---------------------------------------------------------------------------

class AzureBlobStorageProvider implements StorageProvider {
  private containerName: string;
  private connectionString: string;
  private containerReady?: Promise<void>;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER || "product-images";
  }

  private async getContainer() {
    const { BlobServiceClient } = await import("@azure/storage-blob");
    const service = BlobServiceClient.fromConnectionString(this.connectionString);
    const container = service.getContainerClient(this.containerName);
    if (!this.containerReady) {
      // Private container: images are only exposed via our scoped serve route.
      this.containerReady = container.createIfNotExists().then(() => undefined);
    }
    await this.containerReady;
    return container;
  }

  async getUploadTarget(): Promise<UploadTarget> {
    const { BlobSASPermissions } = await import("@azure/storage-blob");
    const container = await this.getContainer();
    const blobName = `uploads/${randomUUID()}`;
    const blob = container.getBlockBlobClient(blobName);
    const uploadURL = await blob.generateSasUrl({
      permissions: BlobSASPermissions.parse("cw"),
      expiresOn: new Date(Date.now() + 15 * 60 * 1000),
    });
    return {
      uploadURL,
      servingPath: `/api/storage/objects/${blobName}`,
      uploadHeaders: { "x-ms-blob-type": "BlockBlob" },
    };
  }

  async serveObject(objectKey: string): Promise<ServedObject> {
    const container = await this.getContainer();
    const blob = container.getBlockBlobClient(objectKey);

    let download;
    try {
      download = await blob.download();
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404) throw new ObjectNotFoundError();
      throw err;
    }

    const contentType = download.contentType ?? "";
    if (!contentType.startsWith("image/") || !download.readableStreamBody) {
      throw new ObjectNotFoundError();
    }
    return {
      contentType,
      contentLength: download.contentLength,
      cacheControl: "public, max-age=3600",
      body: download.readableStreamBody as Readable,
    };
  }
}

// ---------------------------------------------------------------------------

let provider: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    const azureConn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    provider = azureConn
      ? new AzureBlobStorageProvider(azureConn)
      : new ReplitStorageProvider();
  }
  return provider;
}
