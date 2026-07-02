/**
 * Vyapar Bulk Import
 * POST /api/admin/products/vyapar-import/preview  — parse + map, no DB writes
 * POST /api/admin/products/vyapar-import          — auto-create categories + upsert products
 *
 * Supports both .csv and .xlsx files exported from Vyapar Gold Desktop.
 * SheetJS (xlsx package) handles both formats transparently.
 */
import { Router, type IRouter } from "express";
import { read, utils } from "xlsx";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";
import { logger } from "../../lib/logger";

const log = logger.child({ module: "vyapar-import" });

const router: IRouter = Router();

// ── Vyapar column aliases ─────────────────────────────────────────────────────

const ALIASES = {
  name: [
    "item name*",
    "item name",
    "product name",
    "item/service name",
    "item / service name",
    "name",
    "item",
    "product",
    "description",
  ],
  brand: [
    "company",
    "brand",
    "manufacturer",
    "company name",
    "supplier",
  ],
  category: [
    "category",
    "category name",
    "item category",
    "product category",
  ],
  mrp: [
    "default mrp",
    "mrp",
    "m.r.p.",
    "m.r.p",
    "maximum retail price",
    "max retail price",
  ],
  price: [
    "sale price",
    "selling price",
    "price",
    "sales price",
    "sell price",
    "sp",
    "rate",
  ],
  stock: [
    "current stock quantity",
    "stock qty",
    "stock quantity",
    "quantity",
    "qty",
    "available qty",
    "available stock",
    "closing stock",
    "current stock",
    "balance qty",
    "stock",
  ],
  barcode: [
    "item code",
    "barcode",
    "barcode no",
    "barcode no.",
    "barcode number",
    "sku",
    "product code",
    "code",
  ],
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveCol(headers: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function cell(cols: unknown[], idx: number): string {
  if (idx < 0 || idx >= cols.length) return "";
  const v = cols[idx];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Positive integer from a price/number string. Returns 0 if unparseable. */
function parseIntVal(raw: string): number {
  if (!raw) return 0;
  const n = Math.round(parseFloat(raw.replace(/[^0-9.]/g, "")));
  return isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Normalize product name for fuzzy matching.
 * "Aashirvaad Atta 5 Kg" → "aashirvaad atta 5kg"
 * "G-Gold  Biscuits"     → "g gold biscuits"
 */
function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(
      /(\d+\.?\d*)\s*(kg|g|gm|gms|gram|grams|ml|ltr|liter|litre|oz|lb|lbs|pc|pcs|piece|pieces|pack|pkt|packet)\b/gi,
      (_, num, unit) => `${num}${unit.toLowerCase()}`
    )
    .replace(/(\d)(\s*)\bl\b/gi, "$1l")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── XLSX / CSV parser (SheetJS handles both) ──────────────────────────────────

interface ParsedSheet {
  dataRows: unknown[][];
  headers: string[];
  colName: number;
  colBrand: number;
  colCat: number;
  colMrp: number;
  colPrice: number;
  colStock: number;
  colBarcode: number;
}

function parseFile(fileBase64: string, fileName: string): ParsedSheet | { error: string } {
  let allRows: unknown[][];
  try {
    const buffer = Buffer.from(fileBase64, "base64");
    const workbook = read(buffer, {
      type: "buffer",
      cellDates: false,
      cellNF: false,
      cellStyles: false,
      sheetStubs: false,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { error: "No worksheets found in the file." };

    allRows = utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];
  } catch (err) {
    log.error({ err, fileName }, "File parse failed");
    return {
      error:
        "Failed to parse the file. Please export directly from Vyapar (Items Report → Export → Excel or CSV).",
    };
  }

  // Strip completely blank rows
  const nonBlank = allRows.filter((r) =>
    (r as unknown[]).some((v) => v !== "" && v !== null && v !== undefined)
  );

  if (nonBlank.length < 2) {
    return { error: "File must have a header row and at least one data row." };
  }

  // Normalise headers: lowercase, keep * and /, strip other special chars
  const headers = (nonBlank[0] as unknown[]).map((h) =>
    String(h ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9 ./*]/g, "")
      .trim()
  );

  const colName    = resolveCol(headers, ALIASES.name);
  const colBrand   = resolveCol(headers, ALIASES.brand);
  const colCat     = resolveCol(headers, ALIASES.category);
  const colMrp     = resolveCol(headers, ALIASES.mrp);
  const colPrice   = resolveCol(headers, ALIASES.price);
  const colStock   = resolveCol(headers, ALIASES.stock);
  const colBarcode = resolveCol(headers, ALIASES.barcode);

  log.info(
    { fileName, colName, colBrand, colCat, colMrp, colPrice, colStock, colBarcode, headers },
    "Column mapping resolved"
  );

  if (colName === -1 && colBarcode === -1) {
    return {
      error: `File must have an "Item name*" or "Item code" column. Detected columns: ${headers.join(", ")}`,
    };
  }

  if (colPrice === -1 && colMrp === -1) {
    return {
      error: `File must have a "Sale price" or "Default Mrp" column. Detected columns: ${headers.join(", ")}`,
    };
  }

  const dataRows = nonBlank.slice(1);
  return { dataRows, headers, colName, colBrand, colCat, colMrp, colPrice, colStock, colBarcode };
}

// ── Mapped row (shared between preview and import) ─────────────────────────

interface MappedRow {
  name: string;
  brand: string;
  category: string;   // raw category name from file (will be resolved to ID on import)
  mrp: number;
  price: number;
  stockQty: number;
  barcode: string;
  rowNum: number;
}

interface MapRowsResult {
  rows: MappedRow[];
  skippedBlank: number;    // no name AND no barcode, or separator rows
  skippedNoPrice: number;  // has a name but no usable price (both mrp and price are 0/absent)
}

function mapRows(parsed: ParsedSheet): MapRowsResult {
  const { dataRows, colName, colBrand, colCat, colMrp, colPrice, colStock, colBarcode } = parsed;

  const rows: MappedRow[] = [];
  let skippedBlank    = 0;
  let skippedNoPrice  = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const cols   = dataRows[i] as unknown[];
    const rowNum = i + 2; // 1-indexed + header row

    const rawName    = cell(cols, colName);
    const rawBarcode = cell(cols, colBarcode);

    // Skip truly blank rows and separator rows (rows full of dashes/asterisks)
    if (!rawName && !rawBarcode) { skippedBlank++; continue; }
    if (rawName && /^[-=*_]{2,}$/.test(rawName)) { skippedBlank++; continue; }

    const rawMrp   = cell(cols, colMrp);
    const rawPrice = cell(cols, colPrice);

    const mrp   = parseIntVal(rawMrp);
    const price = parseIntVal(rawPrice) || mrp; // fall back to MRP if sale price absent/zero

    if (price === 0) {
      // Row has a name but no usable price — count separately, not as "blank"
      skippedNoPrice++;
      log.warn({ rowNum, rawName, rawBarcode, rawMrp, rawPrice }, "Row skipped — no usable price");
      continue;
    }

    rows.push({
      name:     rawName,
      brand:    cell(cols, colBrand),
      category: cell(cols, colCat),
      mrp:      mrp || price, // fall back to price if MRP also absent
      price,
      stockQty: parseIntVal(cell(cols, colStock)),
      barcode:  rawBarcode,
      rowNum,
    });
  }

  return { rows, skippedBlank, skippedNoPrice };
}

// ── POST /api/admin/products/vyapar-import/preview ────────────────────────────

router.post(
  "/admin/products/vyapar-import/preview",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { fileBase64, fileName } = (req.body ?? {}) as {
      fileBase64?: unknown;
      fileName?: unknown;
    };

    if (typeof fileBase64 !== "string" || !fileBase64.trim()) {
      res.status(400).json({ error: "fileBase64 is required" });
      return;
    }

    const safeFileName =
      typeof fileName === "string" && fileName.trim() ? fileName.trim() : "upload";

    const parsed = parseFile(fileBase64, safeFileName);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { rows, skippedBlank, skippedNoPrice } = mapRows(parsed);

    // Deduplicate category names for summary
    const uniqueCategories = [...new Set(rows.map((r) => r.category).filter(Boolean))];

    log.info(
      { fileName: safeFileName, totalRows: rows.length, skippedBlank, skippedNoPrice, uniqueCategories: uniqueCategories.length },
      "Preview complete"
    );

    res.json({
      totalRows:        rows.length,
      skippedBlank,
      skippedNoPrice,
      uniqueCategories: uniqueCategories.length,
      categoryNames:    uniqueCategories.slice(0, 20), // first 20 for display
      sample:           rows.slice(0, 50),
    });
  }
);

// ── POST /api/admin/products/vyapar-import ────────────────────────────────────

router.post(
  "/admin/products/vyapar-import",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { fileBase64, fileName } = (req.body ?? {}) as {
      fileBase64?: unknown;
      fileName?: unknown;
    };

    if (typeof fileBase64 !== "string" || !fileBase64.trim()) {
      res.status(400).json({ error: "fileBase64 is required" });
      return;
    }

    const safeFileName =
      typeof fileName === "string" && fileName.trim() ? fileName.trim() : "upload";

    log.info({ fileName: safeFileName }, "Vyapar import started");

    // Parse file
    const parsed = parseFile(fileBase64, safeFileName);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { rows, skippedBlank, skippedNoPrice } = mapRows(parsed);

    if (rows.length === 0) {
      res.status(400).json({ error: "No valid product rows found in the file." });
      return;
    }

    // ── Load existing categories ─────────────────────────────────────────────
    const existingCategories = await db.select().from(categoriesTable);
    // Map: lowercase name → { id, name }
    const catByName = new Map<string, { id: number; name: string }>();
    for (const c of existingCategories) {
      catByName.set(c.name.trim().toLowerCase(), { id: c.id, name: c.name });
    }

    // ── Load existing products for matching ──────────────────────────────────
    const existingProducts = await db
      .select({ id: productsTable.id, name: productsTable.name, barcode: productsTable.barcode })
      .from(productsTable);

    const byBarcode    = new Map<string, number>(); // barcode → product id
    const byNormName   = new Map<string, number>(); // normalized name → product id
    for (const p of existingProducts) {
      if (p.barcode?.trim()) byBarcode.set(p.barcode.trim().toLowerCase(), p.id);
      const norm = normalizeName(p.name);
      if (norm) byNormName.set(norm, p.id);
    }

    log.info(
      { rowsToProcess: rows.length, existingProducts: existingProducts.length, existingCategories: existingCategories.length },
      "Reference data loaded"
    );

    // ── Process rows ─────────────────────────────────────────────────────────
    let created = 0;
    let updated = 0;
    let failed  = 0;
    const errors: string[] = [];

    // Cache newly-created categories within this import so we don't double-insert
    const newCatCache = new Map<string, number>(); // lowercase name → id

    for (const row of rows) {
      try {
        // ── 1. Resolve or auto-create category ──────────────────────────────
        let categoryId = "0"; // fallback (no category)

        if (row.category) {
          const catKey = row.category.toLowerCase();
          const existing = catByName.get(catKey) ?? (newCatCache.has(catKey) ? { id: newCatCache.get(catKey)!, name: row.category } : undefined);

          if (existing) {
            categoryId = String(existing.id);
          } else {
            // Auto-create
            const [newCat] = await db
              .insert(categoriesTable)
              .values({
                name:         row.category,
                emoji:        "🏪",
                status:       "active",
                displayOrder: 0,
              })
              .returning();
            if (newCat) {
              catByName.set(catKey, { id: newCat.id, name: newCat.name });
              newCatCache.set(catKey, newCat.id);
              categoryId = String(newCat.id);
              log.info({ categoryName: row.category, categoryId: newCat.id }, "Auto-created category");
            }
          }
        }

        // ── 2. Match existing product ────────────────────────────────────────
        let existingId: number | undefined;
        if (row.barcode) {
          existingId = byBarcode.get(row.barcode.toLowerCase());
        }
        if (!existingId) {
          existingId = byNormName.get(normalizeName(row.name));
        }

        // ── 3. Build values object ───────────────────────────────────────────
        const values = {
          name:       row.name,
          brand:      row.brand || "",
          categoryId,
          weight:     "",              // Vyapar doesn't export weight
          mrp:        row.mrp,
          price:      row.price,
          stockQty:   row.stockQty,
          inStock:    row.stockQty > 0,
          barcode:    row.barcode || null,
          imageUrl:   null as string | null,
          enabled:    true,
          updatedAt:  new Date(),
        };

        // ── 4. Upsert ────────────────────────────────────────────────────────
        if (existingId) {
          // Update existing product (keep existing imageUrl and other fields intact)
          await db
            .update(productsTable)
            .set({
              name:      values.name,
              brand:     values.brand,
              categoryId: values.categoryId,
              mrp:       values.mrp,
              price:     values.price,
              stockQty:  values.stockQty,
              inStock:   values.inStock,
              barcode:   values.barcode,
              updatedAt: values.updatedAt,
            })
            .where(eq(productsTable.id, existingId));
          updated++;
        } else {
          // Create new product
          const [inserted] = await db
            .insert(productsTable)
            .values(values)
            .returning({ id: productsTable.id });

          // Cache the new product for subsequent rows with same name/barcode
          if (inserted) {
            if (row.barcode) byBarcode.set(row.barcode.toLowerCase(), inserted.id);
            const norm = normalizeName(row.name);
            if (norm) byNormName.set(norm, inserted.id);
          }
          created++;
        }
      } catch (err: unknown) {
        failed++;
        const reason = err instanceof Error ? err.message : String(err);
        // Cap stored error messages at 50 but always continue processing remaining rows
        if (errors.length < 50) {
          errors.push(`Row ${row.rowNum} "${row.name}": ${reason}`);
        }
        log.warn({ rowNum: row.rowNum, name: row.name, err }, "Row import failed");
      }
    }

    log.info(
      { created, updated, failed, skippedBlank, skippedNoPrice, totalCategoriesCreated: newCatCache.size },
      "Vyapar import complete"
    );

    res.json({
      created,
      updated,
      failed,
      skippedBlank,
      skippedNoPrice,
      totalProcessed: rows.length,
      categoriesCreated: newCatCache.size,
      errors,
    });
  }
);

export default router;
