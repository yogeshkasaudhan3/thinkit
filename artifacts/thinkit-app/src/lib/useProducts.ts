/**
 * Slim module-level product cache.
 *
 * Fetches the first 100 products (alphabetical) once and shares them across
 * all subscribers. Used primarily by CartRecommendations (affinity suggestions)
 * and as a fallback for ProductDetailPage.
 *
 * For category browsing use useCategoryProducts (paginated, server-side filtered).
 * For search use the server-side search endpoint directly (SearchPage).
 * For home-page best-sellers / specials use useHomeProducts (targeted fetches).
 *
 * Refresh policy: cache expires after TTL_MS (5 minutes).
 */
import { useState, useEffect } from 'react';
import type { Product } from './mockData';

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_LIMIT = 100;

interface PagedResponse {
  items: Product[];
  total: number;
  hasMore: boolean;
}

let cachedProducts: Product[] | null = null;
let loadedAt: number | null = null;
let loadState: 'idle' | 'loading' | 'done' | 'error' = 'idle';
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

function isFresh() {
  return loadedAt !== null && Date.now() - loadedAt < TTL_MS;
}

function ensureLoaded() {
  if (loadState === 'loading') return;
  if (loadState === 'done' && isFresh()) return;

  loadState = 'loading';
  fetch(`/api/products?limit=${CACHE_LIMIT}&offset=0`, { credentials: 'include' })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<PagedResponse>;
    })
    .then(({ items }) => {
      cachedProducts = items;
      loadedAt = Date.now();
      loadState = 'done';
      notify();
    })
    .catch(() => {
      loadState = 'error';
      notify();
    });
}

/** Force a cache refresh on next call (e.g. after returning from the admin panel). */
export function invalidateProductsCache() {
  loadedAt = null;
  if (loadState === 'done') loadState = 'idle';
}

export interface UseProductsResult {
  /** First 100 enabled products — for CartRecommendations and similar-product lookups. */
  allProducts: Product[];
  loading: boolean;
  error: boolean;
}

export function useProducts(): UseProductsResult {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    subscribers.add(fn);
    ensureLoaded();
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  const loading = loadState === 'idle' || loadState === 'loading';
  const error = loadState === 'error';
  const all = cachedProducts ?? [];

  return { allProducts: all, loading, error };
}
