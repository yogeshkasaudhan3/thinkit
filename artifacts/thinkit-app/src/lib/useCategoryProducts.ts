/**
 * Paginated product loader for a single category (optionally filtered by subcategory).
 *
 * Fetches 20 products at a time from the server. Re-fetches from scratch whenever
 * categoryId or subcategory changes so the grid always shows the right set.
 *
 * Usage:
 *   const { products, loading, loadingMore, hasMore, total, loadMore } =
 *     useCategoryProducts(categoryId, activeSubcategoryName);
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product } from './mockData';

const PAGE_SIZE = 20;

interface PagedResponse {
  items: Product[];
  total: number;
  hasMore: boolean;
}

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const offsetRef = useRef(0);
  // Abort previous in-flight request on reset
  const controllerRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (catId: string | undefined, sub: string | null | undefined, pageOffset: number, append: boolean) => {
      // Cancel any previous request
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
        // undefined catId = all products (no category filter)
        if (catId) params.set('categoryId', catId);
        if (sub) params.set('subcategory', sub);

        const r = await fetch(`/api/products?${params}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: PagedResponse = await r.json();

        setProducts((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setHasMore(data.hasMore);
        offsetRef.current = pageOffset + data.items.length;
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
  // categoryId === undefined means "all products" (no category filter).
  // Pass enabled=false from the caller to suppress fetching entirely.
  useEffect(() => {
    offsetRef.current = 0;
    fetchPage(categoryId, subcategory, 0, false);

    return () => {
      controllerRef.current?.abort();
    };
  }, [categoryId, subcategory, fetchPage]);

  const loadMore = useCallback(() => {
    // categoryId may be undefined (= "all products") — only gate on loading state
    if (loading || loadingMore || !hasMore) return;
    fetchPage(categoryId, subcategory, offsetRef.current, true);
  }, [categoryId, subcategory, loading, loadingMore, hasMore, fetchPage]);

  return { products, loading, loadingMore, error, hasMore, total, loadMore };
}
