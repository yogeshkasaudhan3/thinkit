/**
 * Error thrown by adminFetch when the server responds with a non-OK status.
 * Carries the HTTP `status` code so the global 401 handler in App.tsx can
 * detect session expiry from any React Query query or mutation.
 */
export class AdminFetchError extends Error {
  readonly name = 'AdminFetchError';
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Unauthorized (401) callback — called by adminFetch *before* throwing so
// that imperative callers (event handlers) also trigger sign-out, not just
// React Query's queryCache/mutationCache error hooks.
// ---------------------------------------------------------------------------

let _unauthorizedHandler: (() => void) | null = null;

/**
 * Register a function to be called whenever adminFetch receives a 401.
 * Call this once at app startup (e.g. in App.tsx).
 */
export function setAdminUnauthorizedHandler(handler: () => void): void {
  _unauthorizedHandler = handler;
}

/**
 * Shared fetch helper for admin-only endpoints.
 * Always sends cookies and throws `AdminFetchError` (with `status`) on
 * non-2xx responses so the global 401 handler can intercept them.
 *
 * Returns `null` for 204 / 205 / empty-body responses.
 */
export async function adminFetch<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const r = await fetch(url, { credentials: 'include', ...options });

  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    const err = new AdminFetchError(
      (d as Record<string, string>).error ?? `HTTP ${r.status}`,
      r.status,
    );
    // Fire the unauthorized handler *before* throwing so that imperative
    // callers (event handlers that catch and show toasts) still trigger
    // the sign-out redirect on session expiry.
    if (r.status === 401) {
      _unauthorizedHandler?.();
    }
    throw err;
  }

  // 204 / 205 / empty-body — return null cast to T so callers that
  // explicitly pass T=null (e.g. mutation responses) still type-check.
  if (r.status === 204 || r.status === 205 || r.headers.get('content-length') === '0') {
    return null as unknown as T;
  }

  return r.json() as Promise<T>;
}
