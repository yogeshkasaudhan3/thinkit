/**
 * Module-level banner cache.
 * Same pattern as useProducts — one fetch shared across all subscribers.
 * Banners refresh every 5 minutes so admin changes show up without a reload.
 */

const TTL_MS = 5 * 60 * 1000;

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  imageUrl: string | null;
  bg: string | null;
  enabled: boolean;
  sortOrder: number;
}

let cachedBanners: Banner[] | null = null;
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
  fetch('/api/banners', { credentials: 'include' })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Banner[]>;
    })
    .then((data) => {
      cachedBanners = data;
      loadedAt = Date.now();
      loadState = 'done';
      notify();
    })
    .catch(() => {
      loadState = 'error';
      notify();
    });
}

export function invalidateBannersCache() {
  loadedAt = null;
  if (loadState === 'done') loadState = 'idle';
}

import { useState, useEffect } from 'react';

export function useBanners() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    subscribers.add(fn);
    ensureLoaded();
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  return {
    banners: cachedBanners ?? [],
    loading: loadState === 'idle' || loadState === 'loading',
    error: loadState === 'error',
  };
}
