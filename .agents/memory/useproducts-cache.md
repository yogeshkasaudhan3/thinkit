---
name: useProducts cache pattern
description: Module-level subscriber cache for fetching enabled products from /api/products; TTL + invalidation.
---

## Rule
All customer-app components use `useProducts()` from `lib/useProducts.ts`. The cache is module-level (not React context): one fetch, all subscribers re-render when data arrives.

## Key details
- `invalidateProductsCache()` exported for programmatic refresh (e.g. after admin edits).
- TTL: 5 minutes (`TTL_MS`). After expiry, next `useProducts()` call triggers a fresh fetch.
- `useProducts({ categoryId })` filters client-side from the shared `allProducts` array.
- `useProducts()` returns `{ products, allProducts, loading, error }`.
- Fuse search engine: built via `createSearchEngine(allProducts)` in `lib/search.ts`; memoize with `useMemo` per component — don't call at module level.

**Why:** One fetch shared across product list, home, search, cart, and product detail. Avoids duplicate requests and context provider boilerplate.

**How to apply:** Any new page/component needing products uses `useProducts()`. For search specifically, wrap `createSearchEngine(allProducts)` in `useMemo`.
