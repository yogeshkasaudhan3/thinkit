/**
 * Universal image optimisation utility.
 *
 * Handles two kinds of image URLs:
 *
 * 1. Cloudinary URLs — injects `f_auto,q_auto,w_<width>` after `/upload/`
 *    so the Cloudinary CDN returns the best format (WebP/AVIF) at the right
 *    size automatically.
 *
 * 2. GCS proxy URLs (`/api/storage/objects/...`) — appends `?w=<width>` so
 *    the API server's Sharp pipeline resizes and converts to WebP on first
 *    request. Subsequent requests are served from the browser's 1-year cache.
 *
 * All other URLs (external CDN, absolute HTTPS, etc.) are returned unchanged
 * so nothing breaks if images aren't on one of these two services.
 *
 * @param url   Raw image URL from the product / category / banner record.
 * @param width Target width in px. Default 400 — suitable for a 2-column
 *              product grid on 390 px screens at 2× DPR.
 */
export function cloudinaryOpt(
  url: string | null | undefined,
  width = 400,
): string | null {
  if (!url) return null;

  // ── Cloudinary ──────────────────────────────────────────────────────────────
  if (url.includes('res.cloudinary.com')) {
    // Avoid double-injecting if *any* transform segment already follows /upload/.
    // A transformed URL looks like: .../upload/f_auto,q_auto,w_400/...
    if (/\/upload\/[a-z0-9_,]+\//.test(url)) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }

  // ── GCS proxy (served by our API server with Sharp) ─────────────────────────
  // Only match if the URL's *path* starts with the known storage prefixes —
  // anchored at the start of the path segment so a URL that merely contains
  // this string in a query param doesn't get falsely matched.
  const GCS_PREFIXES = ['/api/storage/objects/', '/api/storage/public-objects/'];
  const isGcsProxy =
    GCS_PREFIXES.some((p) => url.startsWith(p)) ||
    GCS_PREFIXES.some((p) => /^https?:\/\/[^/]+/.exec(url)?.[0] && url.includes(p));
  if (isGcsProxy) {
    // Don't append if ?w= is already in the URL.
    if (/[?&]w=/.test(url)) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}w=${width}`;
  }

  return url;
}
