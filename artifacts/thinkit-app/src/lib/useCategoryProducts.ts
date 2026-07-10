/**
 * Paginated product loader for a single category (optionally filtered by subcategory).
 *
 * Fetches 20 products at a time from the server. Re-fetches from scratch whenever
 * categoryId or subcategory changes so the grid always shows the right set.
 *
 * Module-level SWR cache: the first page (and any subsequent pages loaded via
 * infinite scroll) are cached per {categoryId, subcategory} key with a 5-minute
 * TTL. On re-navigation to a previously-visited category the hook seeds its
 * useState directly from cache, avoiding both the skeleton flash and any network
 * round-trip until the TTL expires.
 *
 * Usage:
 *   const { products, loading, loadingMore, hasMore, total, loadMore } =
 *     useCategoryProducts(categoryId, activeSubcategoryName);
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product } from './mockData';

const PAGE_SIZE = 20;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface PagedResponse {
  items: Product[];
  total: number;
  hasMore: boolean;
}

// ─── Module-level SWR page cache ─────────────────────────────────────────────

interface PageCacheEntry {
  products: Product[];
  total: number;
  hasMore: boolean;
  /** Next offset to pass to loadMore — equals all products accumulated so far. */
  offset: number;
  ts: number;
}

// Cap at 40 entries (categoryId × subcategory combos). When exceeded, evict
// the oldest entry. Map preserves insertion order so the first key is oldest.
const PAGE_CACHE_MAX = 40;
const pageCache = new Map<string, PageCacheEntry>();

function buildKey(
  categoryId: string | undefined,
  subcategory: string | null | undefined,
): string {
  return `${categoryId ?? ''}||${subcategory ?? ''}`;
}

/**
 * Invalidate all cached category pages.
 * Call after admin product mutations so the next visit re-fetches fresh data.
 */
export function invalidateCategoryProductsCache(): void {
  pageCache.clear();
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UseCategoryProductsResult {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  error: boolean;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
}

export function useCategoryProducts(
  categoryId: string | undefined,
  /** Exact subcategory name to filter by. Pass null / undefined for "All". */
  subcategory?: string | null,
): UseCategoryProductsResult {
  // ── Synchronous cache read for initial state ───────────────────────────────
  // useState only uses these values on first mount; subsequent renders recompute
  // them but they are ignored. The Map lookup is O(1) so the overhead is trivial.
  const initKey = buildKey(categoryId, subcategory);
  const initEntry = pageCache.get(initKey);
  const initValid = !!initEntry && Date.now() - initEntry.ts < CACHE_TTL_MS;

  const [products, setProducts] = useState<Product[]>(
    initValid ? initEntry.products : [],
  );
  const [loading, setLoading] = useState<boolean>(!initValid);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(initValid ? initEntry.hasMore : false);
  const [total, setTotal] = useState(initValid ? initEntry.total : 0);

  const offsetRef = useRef<number>(initValid ? initEntry.offset : 0);

  // Mutable mirror of products — lets fetchPage build the appended array
  // without a stale closure on the products state value.
  const productsRef = useRef<Product[]>(initValid ? initEntry.products : []);

  const controllerRef = useRef<AbortController | null>(null);

  // If this key seeded initial state we skip the first useEffect fetch so we
  // don't overwrite cache-seeded data with a loading spinner.
  const mountKeyRef = useRef<string | null>(initValid ? initKey : null);

  const fetchPage = useCallback(
    async (
      catId: string | undefined,
      sub: string | null | undefined,
      pageOffset: number,
      append: boolean,
    ) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(false);
      }

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(pageOffset),
        });
        if (catId) params.set('categoryId', catId);
        if (sub) params.set('subcategory', sub);

        const r = await fetch(`/api/products?${params}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: PagedResponse = await r.json();

        const newProducts = append
          ? [...productsRef.current, ...data.items]
          : data.items;

        productsRef.current = newProducts;
        setProducts(newProducts);
        setTotal(data.total);
        setHasMore(data.hasMore);

        const nextOffset = pageOffset + data.items.length;
        offsetRef.current = nextOffset;

        // Persist results so re-navigation is instant within the TTL window.
        // Evict the oldest entry first if the map is at its size cap.
        const cKey = buildKey(catId, sub);
        if (!pageCache.has(cKey) && pageCache.size >= PAGE_CACHE_MAX) {
          pageCache.delete(pageCache.keys().next().value as string);
        }
        pageCache.set(cKey, {
          products: newProducts,
          total: data.total,
          hasMore: data.hasMore,
          offset: nextOffset,
          ts: Date.now(),
        });
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // Reset and re-fetch when category or subcategory changes.
  useEffect(() => {
    const key = buildKey(categoryId, subcategory);

    // First mount with a cache hit: state is already seeded; skip the fetch.
    if (mountKeyRef.current === key) {
      mountKeyRef.current = null;
      return;
    }
    mountKeyRef.current = null;

    // Subcategory / category changed: serve from cache if still fresh.
    const entry = pageCache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
      productsRef.current = entry.products;
      setProducts(entry.products);
      setTotal(entry.total);
      setHasMore(entry.hasMore);
      offsetRef.current = entry.offset;
      setLoading(false);
      setError(false);
      return;
    }

    // No valid cache — fetch from network.
    offsetRef.current = 0;
    productsRef.current = [];
    fetchPage(categoryId, subcategory, 0, false);

    return () => {
      controllerRef.current?.abort();
    };
  }, [categoryId, subcategory, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchPage(categoryId, subcategory, offsetRef.current, true);
  }, [categoryId, subcategory, loading, loadingMore, hasMore, fetchPage]);

  return { products, loading, loadingMore, error, hasMore, total, loadMore };
}
