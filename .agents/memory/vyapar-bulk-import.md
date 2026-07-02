---
name: Vyapar bulk import
description: POST /api/admin/products/vyapar-import; creates and updates products from Vyapar CSV/XLSX exports with auto-category creation.
---

## Route
`artifacts/api-server/src/routes/admin/vyapar-import.ts` — registered in `routes/index.ts`

## Endpoints
- `POST /api/admin/products/vyapar-import/preview` — parse + map columns, no DB writes, returns `{totalRows, skippedBlank, skippedNoPrice, uniqueCategories, categoryNames[20], sample[50]}`
- `POST /api/admin/products/vyapar-import` — full upsert, returns `{created, updated, failed, skippedBlank, skippedNoPrice, totalProcessed, categoriesCreated, errors[50]}`

## Schema defaults (Vyapar doesn't export these)
- `brand` → `""` (notNull field)
- `weight` → `""` (notNull field)
- `imageUrl` → `null` (admin adds images manually later)
- `categoryId` → `String(category.id)` (matching existing convention; `"0"` if no category)
- `subcategory` → NOT mapped yet (Vyapar XLSX has no subcategory column; follow-up task planned)

## Auto-category creation
- Per-import `newCatCache` Map prevents duplicate inserts for same category name in one run
- Updates both `catByName` (session map) and `newCatCache` after insert
- Default emoji: "🏪", status: "active"

## Row skipping — two distinct counters
- `skippedBlank` — rows where BOTH name AND barcode are empty, or name matches `/^[-=*_]{2,}$/`
- `skippedNoPrice` — rows with a name but zero/absent price after MRP fallback; NOT labeled blank

## Error handling
- Per-row try/catch: failed rows increment `failed` counter, import continues for all remaining rows
- Error messages capped at 50 stored (use `if (errors.length < 50) errors.push(...)` — never `break`)

**Why:** Early `break` on error cap would silently stop a 1700-product import after 50 failures.

## Product matching (update vs create)
1. Barcode (`Item code`) — case-insensitive
2. `normalizeName()` — same function as inventory-sync; strips special chars, collapses units ("5 Kg"→"5kg")

On update: only updates `name, brand, categoryId, mrp, price, stockQty, inStock, barcode, updatedAt` — preserves existing `imageUrl` and other fields.

New product IDs are cached in `byBarcode`/`byNormName` maps during the import run to handle duplicate rows without DB re-queries.
