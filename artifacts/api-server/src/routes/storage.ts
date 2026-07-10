import { Readable, pipeline } from "stream";
import sharp from "sharp";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const ONE_YEAR = 31_536_000;
const MAX_RESIZE_WIDTH = 1600;

/**
 * POST /storage/uploads/request-url
 *
 * Admin-only: request a presigned URL for direct-to-GCS file upload.
 * Client sends JSON metadata (name, size, contentType) — NOT the file.
 */
router.post(
  "/storage/uploads/request-url",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    // Server-side MIME whitelist — only accept image types for product uploads
    const ALLOWED_MIME = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    if (!ALLOWED_MIME.has(parsed.data.contentType)) {
      res
        .status(400)
        .json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed" });
      return;
    }
    if (parsed.data.size > MAX_BYTES) {
      res.status(400).json({ error: "File must be 10 MB or smaller" });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        })
      );
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  }
);

/**
 * GET /storage/public-objects/*filePath
 *
 * Unconditionally public — serves assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * Supports ?w=N for Sharp-based resize + WebP conversion.
 */
router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      await serveImage(req, res, file);
    } catch (error) {
      req.log.error({ err: error }, "Error serving public object");
      res.status(500).json({ error: "Failed to serve public object" });
    }
  }
);

/**
 * GET /storage/objects/*path
 *
 * Public read for product/category images.
 *
 * Optional query params:
 *   ?w=N   — resize to N pixels wide, convert to WebP (Sharp pipeline).
 *            Response is cached for 1 year with `immutable` so the Sharp
 *            cost is paid at most once per image+width per browser.
 *
 * Without ?w — original file is streamed as-is (backward compatible).
 */
router.get(
  "/storage/objects/*path",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      const objectPath = `/objects/${wildcardPath}`;
      const objectFile =
        await objectStorageService.getObjectEntityFile(objectPath);
      await serveImage(req, res, objectFile);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      req.log.error({ err: error }, "Error serving object");
      res.status(500).json({ error: "Failed to serve object" });
    }
  }
);

/**
 * Shared helper — stream a GCS file to the response, optionally applying
 * Sharp resize + WebP conversion when ?w=N is present in the request.
 */
async function serveImage(
  req: Request,
  res: Response,
  file: Awaited<ReturnType<typeof objectStorageService.getObjectEntityFile>>,
): Promise<void> {
  const wParam = req.query.w;
  const requestedWidth = wParam
    ? Math.min(MAX_RESIZE_WIDTH, Math.max(1, parseInt(String(wParam), 10)))
    : null;

  const [metadata] = await file.getMetadata();
  const originalContentType =
    (metadata.contentType as string) || "application/octet-stream";
  const isImage = originalContentType.startsWith("image/");
  const shouldOptimize = requestedWidth !== null && !isNaN(requestedWidth) && isImage;

  const cacheControl = `public, max-age=${ONE_YEAR}, immutable`;

  if (shouldOptimize) {
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", cacheControl);

    const srcStream = file.createReadStream();
    const transform = sharp()
      .resize(requestedWidth, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality: 82 });

    const onClientClose = () => srcStream.destroy();
    req.on("close", onClientClose);

    srcStream.on("error", (err: NodeJS.ErrnoException) => {
      const silent = ["ERR_STREAM_PREMATURE_CLOSE", "ERR_STREAM_UNABLE_TO_PIPE", "ECONNRESET"];
      if (!silent.includes(err.code ?? "")) {
        req.log.error({ err }, "GCS source stream error");
      }
    });

    try {
      pipeline(srcStream, transform, res, (err) => {
        req.off("close", onClientClose);
        const silent = ["ERR_STREAM_PREMATURE_CLOSE", "ERR_STREAM_UNABLE_TO_PIPE", "ECONNRESET"];
        if (err && !silent.includes((err as NodeJS.ErrnoException).code ?? "")) {
          req.log.error({ err }, "Sharp image pipeline error");
          res.destroy();
        }
      });
    } catch (err) {
      req.off("close", onClientClose);
    }
  } else {
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const src = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      src.on("error", () => { /* swallow — client gone */ });
      src.pipe(res);
      req.on("close", () => src.destroy());
    } else {
      res.end();
    }
  }
}

export default router;
