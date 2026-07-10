/**
 * Admin image upload + bulk optimization routes.
 *
 * POST /admin/images/upload
 *   Accepts a multipart image, runs it through a Sharp pipeline
 *   (resize ≤ 600×600, WebP q85, strip EXIF), uploads to GCS, and returns
 *   the permanent storage URL along with size stats.
 *
 * POST /admin/products/bulk-optimize
 *   Fetches every product whose imageUrl points to a GCS storage object,
 *   re-processes it through the same Sharp pipeline, saves a new GCS object,
 *   and updates the products table row.  Runs up to `batchSize` images per
 *   call so the HTTP request doesn't time out on large catalogues.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { requireAdmin } from "../../middleware/requireAdmin";
import { ObjectStorageService } from "../../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// Store files in memory — we process them immediately with Sharp before writing
// to GCS.  Cap at 15 MB to match the app.ts body limit.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Sharp pipeline ─────────────────────────────────────────────────────────────
async function optimizeToWebP(input: Buffer): Promise<Buffer> {
  // Sharp strips all metadata by default — no .withMetadata() call means
  // EXIF, GPS, ICC profiles and other metadata are not written to output.
  return sharp(input)
    .resize(600, 600, {
      fit: "inside",
      withoutEnlargement: true, // never upscale small originals
    })
    .webp({ quality: 85 })
    .toBuffer();
}

// ── GCS upload helper ──────────────────────────────────────────────────────────
async function uploadBufferToGcs(buffer: Buffer): Promise<string> {
  // Obtain a one-time presigned PUT URL for a fresh UUID-keyed GCS object.
  const presignedUrl = await objectStorageService.getObjectEntityUploadURL();
  // Convert the full GCS signed URL to our normalised /objects/... path.
  const objectPath = objectStorageService.normalizeObjectEntityPath(presignedUrl);

  const response = await fetch(presignedUrl, {
    method: "PUT",
    // Buffer extends Uint8Array (ArrayBufferView) — valid fetch BodyInit in Node 18+
    body: buffer,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(buffer.length),
    },
  });

  if (!response.ok) {
    throw new Error(`GCS upload failed: HTTP ${response.status}`);
  }

  // Return the full path the customer app uses to load the image.
  return `/api/storage${objectPath}`;
}

// ── POST /admin/images/upload ─────────────────────────────────────────────────
router.post(
  "/admin/images/upload",
  requireAdmin,
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    try {
      const originalSize = req.file.size;
      const optimized = await optimizeToWebP(req.file.buffer);
      const imageUrl = await uploadBufferToGcs(optimized);

      res.json({
        imageUrl,
        originalSize,
        optimizedSize: optimized.length,
      });
    } catch (err) {
      req.log.error({ err }, "Image optimization/upload failed");
      res.status(500).json({ error: "Image processing failed. Please try again." });
    }
  }
);

// ── POST /admin/products/bulk-optimize ────────────────────────────────────────
//
// Uses an ID-based cursor (afterId) so every "Run Again" call advances past
// previously-visited products regardless of skip/fail outcomes.
//
// Flow:
//   1st run: afterId = 0  → scans products with id > 0, processes up to 100
//   2nd run: afterId = <lastId from 1st result> → scans next page, and so on
//
// "remaining" is the count of GCS-image products with id > lastProcessedId so
// the UI can show accurate completion.
router.post(
  "/admin/products/bulk-optimize",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const BATCH_SIZE = 100; // hard cap — keep consistent with UI messaging
    const rawAfterId = Number(req.body?.afterId ?? 0);
    const afterId = Number.isNaN(rawAfterId) ? 0 : Math.max(0, rawAfterId);

    try {
      // Fetch the next page of products (id > afterId) that have GCS imageUrls.
      // Order by id guarantees deterministic forward progress across runs.
      const page = await db
        .select({ id: productsTable.id, name: productsTable.name, imageUrl: productsTable.imageUrl })
        .from(productsTable)
        .where(isNotNull(productsTable.imageUrl))
        .orderBy(productsTable.id)
        .limit(10000); // fetch enough to filter; most catalogues < 5 000 products

      const candidates = page.filter(
        (p) => p.imageUrl?.startsWith("/api/storage/objects/") && p.id > afterId
      );

      const batch = candidates.slice(0, BATCH_SIZE);
      const lastProcessedId = batch.length > 0 ? batch[batch.length - 1].id : afterId;
      // Remaining = GCS-image products beyond the last id in this batch
      const remaining = candidates.length - batch.length;

      let processed = 0;
      let skipped = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const product of batch) {
        try {
          // Strip /api/storage prefix to get the internal object path.
          const objectPath = product.imageUrl!.replace("/api/storage", "");
          const file = await objectStorageService.getObjectEntityFile(objectPath);

          // Download raw bytes from GCS.
          const [rawBuffer] = await file.download();

          // Skip images already optimised: WebP ≤ 600 px on both axes, ≤ 180 KB.
          // Checking format+size is fast (Sharp reads file header only for metadata).
          const meta = await sharp(rawBuffer).metadata();
          const alreadyOptimised =
            meta.format === "webp" &&
            rawBuffer.length <= 180 * 1024 &&
            (meta.width ?? 9999) <= 600 &&
            (meta.height ?? 9999) <= 600;

          if (alreadyOptimised) {
            skipped++;
            continue;
          }

          // Process and upload.
          const optimized = await optimizeToWebP(rawBuffer);
          const newImageUrl = await uploadBufferToGcs(optimized);

          await db
            .update(productsTable)
            .set({ imageUrl: newImageUrl, updatedAt: new Date() })
            .where(eq(productsTable.id, product.id));

          processed++;
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${product.name}: ${msg}`);
          req.log.warn({ productId: product.id, err }, "Bulk optimize: product failed");
        }
      }

      res.json({
        batchSize: batch.length,
        lastProcessedId,
        remaining,
        processed,
        skipped,
        failed,
        errors: errors.slice(0, 20),
        done: remaining === 0,
      });
    } catch (err) {
      req.log.error({ err }, "Bulk image optimization failed");
      res.status(500).json({ error: "Bulk optimization failed. Please try again." });
    }
  }
);

export default router;
