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
 * Capacitor's own local origin, so those same relative paths would not
 * reach the real backend. This module detects that case and points every
 * request made through `@workspace/api-client-react` (and the shared
 * `customFetch`/generated hooks built on top of it) at an absolute API
 * base URL instead.
 *
 * Configure the target via the VITE_API_BASE_URL env var at build time
 * (see artifacts/thinkit-app/.env.example) — nothing is hardcoded here.
 * Use a different value per build to target development vs. production:
 *   - Development/testing build: your Replit dev domain,
 *     e.g. VITE_API_BASE_URL=https://<repl>.replit.dev
 *   - Production build: your deployed production domain,
 *     e.g. VITE_API_BASE_URL=https://thinkit.replit.app (or a custom domain)
 */
export function configureNativeApiBaseUrl(): void {
  if (!Capacitor.isNativePlatform()) {
    // Web build: leave the shared client's base URL untouched (null),
    // so it keeps using relative paths exactly as it does today.
    return;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (!apiBaseUrl) {
    // Fail loudly instead of silently sending requests that can never
    // reach the backend from inside the native WebView.
    console.error(
      '[nativeApiConfig] Running inside the native Android app but ' +
        'VITE_API_BASE_URL was not set at build time. All API requests ' +
        '(login, products, cart, checkout, orders, etc.) will fail. Set ' +
        'VITE_API_BASE_URL in artifacts/thinkit-app/.env before running ' +
        '`pnpm run build` for the Android app — see .env.example.',
    );
    return;
  }

  setBaseUrl(apiBaseUrl);
}
