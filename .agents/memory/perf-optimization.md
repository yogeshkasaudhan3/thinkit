---
name: Performance optimization architecture
description: Paginated API, useCategoryProducts hook, slim useProducts cache, server-side search — all changes made during perf task.
---

## API response format change
`GET /api/products` now returns `{ items: Product[], total: number, hasMore: boolean }` (envelope) instead of a raw array. Any new consumer of this endpoint MUST parse the envelope format.

## useCategoryProducts hook
- New hook in `thinkit-app/src/lib/useCategoryProducts.ts`
- `categoryId: string | undefined` where `undefined` = fetch all products (no category filter)
- `subcategory: string | null | undefined` for server-side subcategory filter
- Uses AbortController + version ref to prevent race conditions
- offsetRef tracks pagination offset (not state, to avoid stale closure in loadMore)

**Why:** categoryId=undefined means "all products" (ProductListingPage /products/all case). Never early-return on undefined — only skip if caller passes an explicit guard.

## useProducts slim cache
- Now fetches only 100 products (no `categoryId` option, no `products` filtered field)
- Returns `{ allProducts, loading, error }` — `products` and `categoryId` option REMOVED
- Used only by CartRecommendations for affinity recommendations
- SubcategoryPage and ProductListingPage use `useCategoryProducts` instead
- SearchPage does its own server-side debounced search

## SearchPage race condition fix
- Uses `versionRef` to gate which request can update state
- No `finally` block — only the winning version calls setResults/setSearching
- Abort on new keystroke but version gating is the true correctness mechanism

## DB indexes
All created via raw SQL (pg_trgm enabled):
- idx_products_enabled, idx_products_category_id, idx_products_enabled_cat
- idx_products_subcategory (WHERE NOT NULL), idx_products_best_seller, idx_products_dwarika
- idx_products_sku, idx_products_barcode
- idx_products_name_trgm, idx_products_brand_trgm (GIN pg_trgm indexes)
Also declared in Drizzle schema (lib/db/src/schema/products.ts) for documentation.
