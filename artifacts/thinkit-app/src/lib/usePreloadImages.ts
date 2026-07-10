import { useLayoutEffect, useMemo } from 'react';
import { cloudinaryOpt } from './imgUtils';
import type { Product } from './mockData';

/**
 * Injects <link rel="preload" as="image"> tags into <head> for the first
 * `count` products immediately after the DOM commits (useLayoutEffect fires
 * before the browser paints, giving the browser the earliest possible signal
 * to start fetching above-the-fold images).
 *
 * Tags are removed when the products list changes (e.g. category switch)
 * so stale preloads don't persist.
 */
export function usePreloadImages(products: Product[], count = 6): void {
  // Key encodes both IDs and resolved hrefs so URL changes (e.g. after bulk
  // optimize rewrites imageUrl) also trigger fresh preloads.
  const preloadKey = useMemo(
    () =>
      products
        .slice(0, count)
        .map((p) => `${p.id}:${cloudinaryOpt(p.imageUrl, 360) ?? ''}`)
        .join(','),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, count],
  );

  // useLayoutEffect: fires synchronously after DOM commit, before paint.
  // Safe here because this is a pure client-side SPA (no SSR).
  useLayoutEffect(() => {
    if (!preloadKey) return;
    const links: HTMLLinkElement[] = [];

    products.slice(0, count).forEach((product) => {
      const href = cloudinaryOpt(product.imageUrl, 360);
      if (!href) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      // fetchPriority is not yet in the HTMLLinkElement typedef
      (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = 'high';
      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      links.forEach((l) => l.remove());
    };
  // preloadKey captures IDs + resolved URLs; safe as sole dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadKey]);
}
