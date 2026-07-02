---
name: Inventory Sync architecture
description: Manual Vyapar XLSX upload → stock update system; safety buffer in store_settings; sync log table; no new products created from upload
---

## Rule
Inventory sync is **update-only** — rows with no match in Thinkit are silently skipped. No new products are auto-created from the file.

**Why:** Thinkit products require fields (category, image, description) that Vyapar doesn't export.

## File format
- Accepts `.xlsx` (Excel) exported from **Vyapar Gold Desktop** → Items Report → Export → Excel
- Parsed server-side using **SheetJS** (`xlsx` npm package in api-server)
- Client reads file via `FileReader.readAsDataURL()` → strips `data:<mime>;base64,` prefix → sends base64 string in JSON body
- JSON body limit is **15 MB** (configured in app.ts) — a 3000-product XLSX is ~500 KB; base64 is ~700 KB

## Exact Vyapar Gold Desktop column names (primary aliases)
| Vyapar column             | Thinkit field   |
|---------------------------|-----------------|
| `Item name*`              | Product Name    |
| `Item code`               | Barcode / SKU   |
| `Category`                | Category        |
| `Default Mrp`             | MRP             |
| `Sale price`              | Selling Price   |
| `Current stock quantity`  | Stock Quantity  |

Header normalisation: lowercase, strip all special chars **except** `* / .` (must keep `*` to match `"Item name*"`).

## Matching priority
1. `Item code` → `products.barcode` (non-empty, case-insensitive)
2. `Item name*` → `products.name` (case-insensitive, exact after trim)

## Category update
- Loads all categories: `Map<name.toLowerCase() → String(id)>`
- Products table stores `categoryId` as `text` = `String(categories.id)` (serial int → string, e.g. `"3"`)
- If CSV Category matches a Thinkit category name, `categoryId` is updated; otherwise skipped silently

## Safety buffer flow
- `store_settings.inventory_safety_buffer` (default 2) read at sync time
- `available = stockQty - buffer`; `inStock = available > 0`
- Customer app uses `inStock` flag as before

## Performance (3000+ products)
- All products loaded into memory maps before row processing (O(1) lookup)
- All DB updates wrapped in a **single drizzle transaction** — significantly faster than individual auto-commit statements

## Async upload state (critical UI invariant)
- `xlsxBase64` is cleared to `''` **before** `FileReader.readAsDataURL()` fires
- Sync button is disabled while `!xlsxBase64` (prevents stale payload from previous file)
- `reader.onerror` / `reader.onabort` both call `clearFile()` and show a toast

**Why:** Without clearing first, selecting a second file leaves the button enabled with the old base64 payload until the new read completes — user could submit stale data.

## Three-tier name matching
1. **Barcode** — `products.barcode` (non-empty, case-insensitive)
2. **Exact name** — case-insensitive, full string
3. **Normalized name** — both sides run through `normalizeName()`: lowercase, unit collapsing ("5 Kg"→"5kg"), non-alphanumeric→space, collapse spaces

`normalizeName` handles: "5 Kg"→"5kg", "5KG"→"5kg", "G-Gold"→"g gold", "100%  Wheat"→"100 wheat", "500ml"→"500ml".

## Preview endpoint (read-only)
`POST /api/admin/inventory-sync/preview` — parses XLSX + runs matching, returns `{totalRows, matched, notFound, skippedBlank, matchedSample[5], notFoundRows[all]}` with **no DB writes**.
- `loadRefData()` must NOT contain any `db.insert()` — settings row upsert belongs in the sync path only (already fixed; if row missing, defaults to buffer=2)

## Three-step UI flow
1. **Upload** — dropzone + "Preview Matches" button
2. **Preview** — match stats + sample matched + all unmatched with reasons; "Confirm & Sync N Products" disabled when matched=0
3. **Result** — 6-stat grid (Total Rows / Updated / OOS / Not Found / Errors / Blank) + unmatched table + "Sync Another File"

## How to apply
- Adding new Vyapar columns: add aliases to the relevant key in `ALIASES` constant in inventory-sync.ts
- Adding new store setting fields that affect sync: add `int(field)` to the admin settings PATCH handler
- Category ID format: always `String(categories.id)` — never store the category name itself in `products.categoryId`
