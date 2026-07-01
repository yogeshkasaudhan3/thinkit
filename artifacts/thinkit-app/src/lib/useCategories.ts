/**
 * Module-level category cache.
 * Same pattern as useProducts — one fetch shared across all subscribers.
 * Categories refresh every 5 minutes so admin changes show up without a reload.
 */

const TTL_MS = 5 * 60 * 1000;

export interface AppCategory {
  id: number;
  name: string;
  emoji: string | null;
  imageUrl: string | null;
  status: string;
  displayOrder: number;
}

let cachedCategories: AppCategory[] | null = null;
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
  fetch('/api/categories', { credentials: 'include' })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<AppCategory[]>;
    })
    .then((data) => {
      cachedCategories = data;
      loadedAt = Date.now();
      loadState = 'done';
      notify();
    })
    .catch(() => {
      loadState = 'error';
      notify();
    });
}

export function invalidateCategoriesCache() {
  loadedAt = null;
  if (loadState === 'done') loadState = 'idle';
}

import { useState, useEffect } from 'react';

export function useCategories() {
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
    categories: cachedCategories ?? [],
    loading: loadState === 'idle' || loadState === 'loading',
    error: loadState === 'error',
  };
}
