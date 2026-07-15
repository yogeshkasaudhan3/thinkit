import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

/**
 * Cloudinary configuration, read only from environment secrets.
 * Never hardcode credentials — CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY /
 * CLOUDINARY_API_SECRET must be set as environment secrets.
 */
function configureCloudinary(): void {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, " +
        "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment secrets.",
    );
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

let configured = false;
function ensureConfigured(): void {
  if (!configured) {
    configureCloudinary();
    configured = true;
  }
}

/**
 * Cloudinary folder per entity type — keeps the media library organised and
 * makes it easy to tell at a glance where an asset is used.
 */
export type CloudinaryFolder =
  | "products"
  | "categories"
  | "subcategories"
  | "banners";

/**
 * Upload an image buffer to Cloudinary and return its permanent, public
 * `secure_url`. Cloudinary assigns the resource a unique `public_id`, so
 * repeated uploads never collide or overwrite each other.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: CloudinaryFolder,
): Promise<UploadApiResponse> {
  ensureConfigured();

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `thinkit/${folder}`,
        resource_type: "image",
        // Already resized/encoded by Sharp before this call — Cloudinary just
        // stores it and serves on-the-fly transforms (see imgUtils.ts) later.
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed with no result"));
          return;
        }
        resolve(result);
      },
    );
    uploadStream.end(buffer);
  });
}

export { cloudinary };
