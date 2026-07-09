---
name: Image optimization architecture
description: How product/category images are optimized — Sharp proxy pipeline for GCS, Cloudinary transforms, imgUtils.ts, loading priorities.
---

## Two optimization paths

**Cloudinary URLs** (`res.cloudinary.com`):
- `cloudinaryOpt(url, width)` injects `f_auto,q_auto,w_N` after `/upload/`
- Guard: skip if `/upload/<transforms>/` already present (regex `/\/upload\/[a-z0-9_,]+\//`)

**GCS proxy URLs** (`/api/storage/objects/...` or `/api/storage/public-objects/...`):
- `cloudinaryOpt(url, width)` appends `?w=N` to the URL
- API server's storage route reads `?w`, pipes GCS stream through Sharp → WebP at quality 82
- Uses Node `stream.pipeline()` (NOT `.pipe()`) so all three streams (GCS, Sharp, res) are torn down on error or client disconnect
- `ERR_STREAM_PREMATURE_CLOSE` (client disconnect) is silently ignored

## Cache headers
All storage responses: `public, max-age=31536000, immutable`
Optimized responses add `Content-Type: image/webp` (no Content-Length since Sharp changes size)

## Width values used per context
| Context | Width |
|---|---|
| Category tile (2-col grid) | 112 |
| Category tile (HomePage row) | 128 |
| Banner carousel | 780 |
| Product card | 400 |
| Cart recommendations | 200 |
| Product detail hero | 600 |

## Loading priorities
| Image | loading | fetchPriority |
|---|---|---|
| Banner first slide | eager | high |
| Product detail hero | eager | high |
| All other images | lazy | auto |

## Sharp install
`sharp` + `@types/sharp` added to `artifacts/api-server/package.json`

**Why:** GCS proxy images don't go through any CDN that supports format negotiation. Adding `?w=N` as cache-busting key means the 1-year immutable cache is correct (different widths = different URLs).

**How to apply:** Always call `cloudinaryOpt(url, width)` before rendering any `<img>` src. Pass the width appropriate for the rendered size (see table above). Never pass raw `imageUrl` directly to `<img src>`.
