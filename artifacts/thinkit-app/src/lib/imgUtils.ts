/**
 * Cloudinary image optimisation.
 *
 * Injects `f_auto,q_auto,w_<width>` after `/upload/` for Cloudinary-hosted
 * URLs. All other URLs (GCS / api-server proxy / external) are returned
 * unchanged so nothing breaks if images aren't on Cloudinary.
 *
 * @param url   Raw image URL from the product/category record.
 * @param width Resize width in px (default 400 — enough for a 2-col grid on
 *              390px screens at 2×DPR).
 */
export function cloudinaryOpt(
  url: string | null | undefined,
  width = 400,
): string | null {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com')) return url;
  // Avoid double-injecting if a transform is already present.
  if (url.includes('/upload/f_auto')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}
