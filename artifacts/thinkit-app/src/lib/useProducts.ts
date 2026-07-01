/**
 * Module-level product cache.
 *
 * The first component that calls useProducts() triggers a single fetch.
 * All subsequent calls (even from different components) share the same
 * cached array and re-render together when data arrives.
 *
 * Refresh policy: cache expires after TTL_MS (5 minutes) so that an
 * already-open customer session picks up admin edits without a full reload.
 */
import { useState, useEffect } from 'react';
import type { Product } from './mockData';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

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

  // Expired or not yet loaded — fetch now
  loadState = 'loading';
  fetch('/api/products', { credentials: 'include' })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Product[]>;
    })
    .then((data) => {
      cachedProducts = data;
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

export interface UseProductsOptions {
  /** Filter by category ID (client-side, after the shared fetch). */
  categoryId?: string;
}

export interface UseProductsResult {
  /** Products matching the requested filter. */
  products: Product[];
  /** All enabled products (unfiltered) — for search and recommendations. */
  allProducts: Product[];
  loading: boolean;
  error: boolean;
}

export function useProducts(options?: UseProductsOptions): UseProductsResult {
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

  const products =
    options?.categoryId ? all.filter((p) => p.categoryId === options.categoryId) : all;

  return { products, allProducts: all, loading, error };
}
