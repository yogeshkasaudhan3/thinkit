---
name: Image optimization architecture
description: Server-side Sharp pipeline for product image upload and bulk optimization — covers both the proxy (on-the-fly) and the upload (at-rest) paths.
---

## Two optimization paths

### 1. Upload path (at-rest optimization)
- Route: `POST /api/admin/images/upload` (multipart, requireAdmin)
- multer memoryStorage, 15 MB limit, MIME whitelist
- Sharp: resize 600×600 `fit:inside, withoutEnlargement`, WebP quality 85
- Sharp strips metadata by default (no `.withMetadata()` call = no metadata in output)
- Uploads optimized buffer to GCS via presigned PUT URL
- Returns `{ imageUrl, originalSize, optimizedSize }`
- Admin panel: `useImageUpload` hook (FormData + credentials:include)

### 2. Proxy path (on-the-fly)
- Route: `GET /api/storage/objects/*?w=N`
- Sharp: resize to width N, WebP q82, stream.pipeline() for cleanup
- 1-year immutable Cache-Control; Content-Type: image/webp
- `cloudinaryOpt(url, width)` in imgUtils.ts appends `?w=N` to GCS URLs

### 3. Bulk optimize
- Route: `POST /api/admin/products/bulk-optimize` (requireAdmin)
- **ID-cursor pagination**: body `{ afterId: number }` → processes 100 products with id > afterId
- Returns `{ batchSize, lastProcessedId, remaining, processed, skipped, failed, done }`
- Admin passes `lastProcessedId` as `afterId` in next "Continue" call
- Skip condition: already WebP + ≤600px + ≤180KB (header-only Sharp metadata check)
- Admin panel: cumulative totals tracked across multiple runs; "Continue (N left)" button

## Width values used per context
| Context | Width |
|---|---|
| Upload (stored) | 600 max |
| Proxy: product cards | 400 |
| Proxy: product detail | 600 |
| Proxy: banners | 780 |
| Proxy: category tiles | 112–128 |
| Proxy: cart recommendations | 200 |

## Loading priorities
| Image | loading | fetchPriority |
|---|---|---|
| Banner first slide | eager | high |
| Product detail hero | eager | high |
| All others | lazy | auto |

## Sharp install
`sharp` + `@types/sharp` + `multer` + `@types/multer` in `artifacts/api-server`

**Why cursor pagination:** After optimization, the new URL still matches `/api/storage/objects/`, so filtering by URL alone can't distinguish optimized from unoptimized. ID cursor guarantees forward progress independent of content.

**How to apply:** Always call `cloudinaryOpt(url, width)` before any `<img src>`. For new uploads, use `useImageUpload` hook (not the old `useUpload` presigned-URL flow).
