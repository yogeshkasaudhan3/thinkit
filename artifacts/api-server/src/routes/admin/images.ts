/**
 * Admin image upload route.
 *
 * POST /admin/images/upload
 *   Accepts a multipart image, runs it through a Sharp pipeline
 *   (resize ≤ 600×600, WebP q85, strip EXIF), uploads it to Cloudinary, and
 *   returns the permanent Cloudinary URL along with size stats.
 *
 * Used by the admin panel's shared image-upload hook for products,
 * categories, subcategories, and banners alike — the caller decides which
 * entity the returned `imageUrl` gets attached to.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { requireAdmin } from "../../middleware/requireAdmin";
import { uploadBufferToCloudinary } from "../../lib/cloudinary";

const router: IRouter = Router();

// Store files in memory — we process them immediately with Sharp before
// uploading the optimised buffer to Cloudinary.
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
      // Generic "products" folder here — the caller (admin panel) doesn't tell
      // us which entity this is for, and Cloudinary folders are just for
      // organisation, not functionality, so a single shared folder is fine.
      const result = await uploadBufferToCloudinary(optimized, "products");

      res.json({
        imageUrl: result.secure_url,
        originalSize,
        optimizedSize: optimized.length,
      });
    } catch (err) {
      req.log.error({ err }, "Image optimization/upload failed");
      res.status(500).json({ error: "Image processing failed. Please try again." });
    }
  }
);

export default router;
