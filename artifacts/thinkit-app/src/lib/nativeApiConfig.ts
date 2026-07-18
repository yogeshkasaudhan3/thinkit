import { Capacitor } from '@capacitor/core';
import { setBaseUrl } from '@workspace/api-client-react';

/**
 * Single source of truth for the API base URL used by the native
 * (Capacitor/Android) build of Thinkit.
 *
 * The web app is unaffected by this file: it keeps using relative paths
 * like `/api/products`, which resolve correctly against whatever domain
 * the site is served from.
 *
 * Inside the Capacitor Android shell, the bundled assets are served from
 * Capacitor's own local origin (capacitor://localhost), so relative paths
 * like `/api/auth/login` would resolve to capacitor://localhost/api/auth/login
 * instead of reaching the real backend — causing an immediate network error.
 *
 * This module fixes that by:
 *   1. Calling setBaseUrl() so the Orval-generated customFetch hooks resolve
 *      relative paths against the real API origin.
 *   2. Patching window.fetch so every raw fetch('/api/...') call in the app
 *      (auth, orders, settings, banners, etc.) also reaches the real backend.
 *      Both fixes are required — the app has 14 raw fetch() call sites that
 *      are not routed through customFetch.
 *
 * Configure the target via the VITE_API_BASE_URL env var at build time
 * (see artifacts/thinkit-app/.env.example) — the production value is injected
 * by the GitHub Actions workflow so it is baked into the release bundle.
 *   - Development/testing build: your Replit dev domain,
 *     e.g. VITE_API_BASE_URL=https://<repl>.replit.dev
 *   - Production build: https://thinkit.store (set in android-release.yml)
 */
export function configureNativeApiBaseUrl(): void {
  if (!Capacitor.isNativePlatform()) {
    // Web build: leave everything untouched — relative paths work correctly
    // because the web app is served from the same origin as the API.
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (!apiBaseUrl) {
    console.error(
      '[nativeApiConfig] Running inside the native Android app but ' +
        'VITE_API_BASE_URL was not set at build time. All API requests ' +
        '(login, products, cart, checkout, orders, etc.) will fail. Set ' +
        'VITE_API_BASE_URL=https://thinkit.store in the build env — see ' +
        'artifacts/thinkit-app/.env.example and .github/workflows/android-release.yml.',
    );
    return;
  }

  const base = apiBaseUrl.replace(/\/+$/, '');

  // ── Fix 1: Orval-generated hooks (customFetch) ─────────────────────────────
  // The shared API client prepends _baseUrl to every relative path before
  // calling the native fetch. Without this, generated hooks also break.
  setBaseUrl(base);

  // ── Fix 2: Raw fetch() calls ───────────────────────────────────────────────
  // The customer app has 14 raw fetch('/api/...') call sites across 10 files
  // (SignInPage, AppContext, useBanners, useCategories, useStoreSettings,
  // ProfileSetupPage, SubcategoryPage, OrdersPage, CreateNewPasswordPage,
  // CheckoutPage). Patching window.fetch here intercepts all of them at once
  // without touching each call site individually.
  const _nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Only rewrite relative paths (starting with /). Absolute URLs and
    // Request objects with absolute URLs are passed through unchanged.
    if (typeof input === 'string' && input.startsWith('/')) {
      return _nativeFetch(`${base}${input}`, init);
    }
    return _nativeFetch(input, init);
  };
}
