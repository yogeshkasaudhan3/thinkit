---
name: Store Settings architecture
description: Single-row store_settings table; public /api/settings; admin PATCH; customer-app module-level cache with safe zero-value parsing
---

## Rule
`store_settings` is a singleton row (id=1). Admin GET/PATCH routes do `INSERT … ON CONFLICT DO NOTHING` before operating so the row self-heals on fresh DBs.

**Why:** The row is seeded at migration time, but if the DB is wiped or recreated the admin panel must not 404.

## Fee calculation
- API server caches settings (1-min TTL) in `artifacts/api-server/src/routes/orders.ts` via `getSettings()`.
- `FeeSettings` interface includes `minOrderEnabled` and `minOrderValue` — enforced server-side at order creation.
- Client (`useStoreSettings`) uses `safeNum(v, fallback)` which preserves `0` (unlike `Number(v) || fallback`).

**Why:** Admin may legitimately set deliveryFee=0 (e.g., launch promo). The `||` pattern would silently restore the default.

## How to apply
- Any code reading fee values from settings: always use `safeNum` or a null-check, never `||`.
- Adding new fee fields: add to `FeeSettings` interface in orders.ts, select them in `getSettings()`, and add to the `DEFAULT_SETTINGS` in `useStoreSettings.ts`.
- lib/db must be compiled (`pnpm exec tsc --build lib/db`) before api-server typecheck picks up new schema exports.
