---
name: Object storage setup
description: GCS-backed object storage for product images — bucket, routes, client package, and upload flow.
---

## Bucket
Provisioned via `setupObjectStorage()`. Env vars set: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`.

## Server routes (`artifacts/api-server/src/routes/storage.ts`)
- `POST /storage/uploads/request-url` — admin-only (requireAdmin), generates GCS presigned PUT URL. Server-side validates MIME (JPEG/PNG/WebP/GIF only) and max size (10 MB).
- `GET /storage/public-objects/*filePath` — unconditionally public, serves PUBLIC_OBJECT_SEARCH_PATHS.
- `GET /storage/objects/*path` — intentionally public (product images must be readable by customers without auth). Do NOT add sensitive objects to this namespace; use a separate protected route.

## Client package (`lib/object-storage-web/`)
- Copied from skill template. Must have `composite: true`, `emitDeclarationOnly: true`, `declarationMap: true` in tsconfig.json and a `"build": "tsc -p tsconfig.json"` script.
- Must be built (`pnpm --filter @workspace/object-storage-web run build`) before typecheck passes.
- `useUpload()` hook: two-step presigned URL flow. Returns `{ uploadFile, isUploading, progress, error }`. `response.objectPath` is like `/objects/uploads/<uuid>`.

## Upload flow (product-form.tsx)
1. Admin clicks "Choose Image" → hidden file input
2. `uploadFile(file)` → POST /api/storage/uploads/request-url → GCS PUT
3. On success: `form.setValue('imageUrl', '/api/storage' + objectPath)`
4. `imageUrl` stored in DB as `/api/storage/objects/uploads/<uuid>`
5. Served via `GET /api/storage/objects/uploads/<uuid>` (public)

**Why:** Save button is disabled while `isUploading` to prevent race between upload completion and form submit.

## OpenAPI
Storage paths + UploadUrlRequest/UploadUrlResponse schemas added to `lib/api-spec/openapi.yaml`. Generated hook: `useRequestUploadUrl` (mutation).
