---
name: Inventory Sync architecture
description: Manual Vyapar CSV → stock update system; safety buffer in store_settings; sync log table; no new products created from CSV
---

## Rule
Inventory sync is **update-only** — CSV rows with no match in Thinkit are silently skipped. No new products are auto-created from the CSV.

**Why:** Thinkit products require fields (category, image, description) that Vyapar doesn't export.

## Matching priority
1. Barcode (products.barcode, nullable — must be non-empty to match)
2. Product name (case-insensitive, exact after trim)

## Safety buffer flow
- `store_settings.inventory_safety_buffer` (default 2) is read at sync time.
- `available = stockQty - buffer`; `inStock = available > 0`
- Customer app uses `inStock` flag as before — no change to customer-side code needed.
- The buffer field is editable in admin Settings → Inventory Settings section.

**Why:** Prevents over-selling due to Vyapar/Thinkit timing gaps.

## CSV parsing
- RFC 4180 compliant inline parser (no npm dep) in `api-server/src/routes/admin/inventory-sync.ts`
- Header aliases cover common Vyapar export column name variations (lowercase comparison).
- Client sends CSV as plain text in JSON body (`{ csvContent, fileName }`) — no multipart upload needed.

## Data model
- `inventory_sync_logs` table: fileName, adminUser, productsUpdated, newProducts (always 0), outOfStockCount, errorCount, errors (jsonb, max 50 stored), syncedAt.
- Admin username looked up via `adminUsersTable` using `req.session.adminId`.

## Dashboard integration
- `GET /api/admin/inventory-sync/last` returns the most recent log summary for the dashboard widget.
- Dashboard shows stale warning if last sync > 8 hours ago, or if no sync has ever run.

## How to apply
- New fee/setting fields that affect sync: add to `store_settings`, add `int(field)` to the admin settings PATCH handler, add to the `getSettings()` selector in inventory-sync route.
- If Vyapar adds new column names: add aliases to the `ALIASES` constant in inventory-sync.ts.
