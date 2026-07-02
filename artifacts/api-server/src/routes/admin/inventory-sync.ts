import { Router, type IRouter } from "express";
import { read, utils } from "xlsx";
import {
  db,
  productsTable,
  storeSettingsTable,
  inventorySyncLogsTable,
  categoriesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";
import { logger } from "../../lib/logger";

const log = logger.child({ module: "inventory-sync" });

const router: IRouter = Router();

// ── Vyapar Gold Desktop column aliases (lowercase, priority order) ─────────────

const ALIASES = {
  name: [
    "item name*",            // Vyapar Gold Desktop exact
    "item name",
    "product name",
    "item/service name",
    "item / service name",
    "name",
    "item",
    "product",
    "description",
  ],
  barcode: [
    "item code",             // Vyapar Gold Desktop exact
    "barcode",
    "barcode no",
    "barcode no.",
    "barcode number",
    "sku",
    "product code",
    "code",
  ],
  category: [
    "category",              // Vyapar Gold Desktop exact
    "category name",
    "item category",
    "product category",
  ],
  mrp: [
    "default mrp",           // Vyapar Gold Desktop exact
    "mrp",
    "m.r.p.",
    "m.r.p",
    "maximum retail price",
    "max retail price",
  ],
  price: [
    "sale price",            // Vyapar Gold Desktop exact
    "selling price",
    "price",
    "sales price",
    "sell price",
    "sp",
    "rate",
  ],
  stock: [
    "current stock quantity", // Vyapar Gold Desktop exact
    "stock qty",
    "stock quantity",
    "quantity",
    "qty",
    "available qty",
    "available stock",
    "closing stock",
    "opening stock",
    "current stock",
    "balance qty",
    "stock",
  ],
} as const;

function resolveCol(headers: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Safely extract a cell value as a trimmed string; never throws. */
function cell(cols: unknown[], idx: number): string {
  if (idx < 0 || idx >= cols.length) return "";
  const v = cols[idx];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Parse a money/numeric string to a positive integer, or NaN. */
function parseMoney(raw: string): number {
  const n = Math.round(parseFloat(raw.replace(/[^0-9.]/g, "")));
  return isFinite(n) && n > 0 ? n : NaN;
}

/**
 * Normalize a product name for fuzzy matching.
 * "Aashirvaad Atta 5 Kg"  → "aashirvaad atta 5kg"
 * "G-Gold  Biscuits 500ml" → "g gold biscuits 500ml"
 * "100% Whole Wheat Bread" → "100 whole wheat bread"
 *
 * Both Thinkit names and Vyapar names are normalised the same way,
 * so the lookup is symmetric.
 */
function normalizeName(raw: string): string {
  return (
    raw
      .toLowerCase()
      // Collapse weight/volume units: "5 Kg" → "5kg", "500 Ml" → "500ml"
      .replace(
        /(\d+\.?\d*)\s*(kg|g|gm|gms|gram|grams|ml|ltr|liter|litre|oz|lb|lbs|pc|pcs|piece|pieces|pack|pkt|packet)\b/gi,
        (_, num, unit) => `${num}${unit.toLowerCase()}`
      )
      // Also handle bare "l" for litres but only when preceded by a digit
      .replace(/(\d)(\s*)\bl\b/gi, "$1l")
      // Replace every non-alphanumeric character with a space
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

// ── Types shared between preview and sync ─────────────────────────────────────

export type MatchMethod = "barcode" | "exact" | "normalized";

export interface PreviewRow {
  rowNum: number;
  vyaparName: string;
  vyaparBarcode: string;
  thinkitName: string | null;
  matchMethod: MatchMethod | null;
  status: "matched" | "not_found";
  notFoundReason?: string;
}

// ── Reference data loader ─────────────────────────────────────────────────────

interface RefData {
  byBarcode:        Map<string, { id: number; name: string }>;
  byExact:          Map<string, { id: number; name: string }>;
  byNormalized:     Map<string, { id: number; name: string }>;
  byCategoryName:   Map<string, string>;
  safetyBuffer:     number;
}

async function loadRefData(): Promise<RefData | { error: string }> {
  // Read-only: no upsert here. If the row doesn't exist yet, default to 2.
  // The sync path calls this same loader; the settings row is created lazily on first sync.
  let safetyBuffer = 2;
  try {
    const [s] = await db
      .select({ inventorySafetyBuffer: storeSettingsTable.inventorySafetyBuffer })
      .from(storeSettingsTable);
    safetyBuffer = s?.inventorySafetyBuffer ?? 2;
  } catch (err) {
    log.warn({ err }, "Could not read safety buffer — using default 2");
  }

  let allProducts: { id: number; name: string; barcode: string | null }[];
  try {
    allProducts = await db
      .select({ id: productsTable.id, name: productsTable.name, barcode: productsTable.barcode })
      .from(productsTable);
  } catch (err) {
    log.error({ err }, "Failed to load products");
    return { error: "Failed to load product catalogue. Please try again." };
  }

  const byBarcode    = new Map<string, { id: number; name: string }>();
  const byExact      = new Map<string, { id: number; name: string }>();
  const byNormalized = new Map<string, { id: number; name: string }>();

  for (const p of allProducts) {
    const entry = { id: p.id, name: p.name };
    if (p.barcode?.trim()) {
      byBarcode.set(p.barcode.trim().toLowerCase(), entry);
    }
    byExact.set(p.name.trim().toLowerCase(), entry);
    const norm = normalizeName(p.name);
    if (norm) byNormalized.set(norm, entry);
  }

  let allCategories: { id: number; name: string }[] = [];
  try {
    allCategories = await db
      .select({ id: categoriesTable.id, name: categoriesTable.name })
      .from(categoriesTable);
  } catch (err) {
    log.warn({ err }, "Failed to load categories — category updates will be skipped");
  }
  const byCategoryName = new Map<string, string>();
  for (const c of allCategories) {
    byCategoryName.set(c.name.trim().toLowerCase(), String(c.id));
  }

  log.info(
    {
      totalProducts: allProducts.length,
      withBarcode: byBarcode.size,
      totalCategories: allCategories.length,
      safetyBuffer,
    },
    "Reference data loaded"
  );

  return { byBarcode, byExact, byNormalized, byCategoryName, safetyBuffer };
}

// ── XLSX parser ───────────────────────────────────────────────────────────────

interface ParsedSheet {
  nonBlankRows: unknown[][];
  headers: string[];
  colName: number;
  colBarcode: number;
  colCat: number;
  colMrp: number;
  colPrice: number;
  colStock: number;
}

function parseXlsx(xlsxBase64: string, fileName: string): ParsedSheet | { error: string } {
  let rows: unknown[][];
  try {
    const buffer = Buffer.from(xlsxBase64, "base64");
    const workbook = read(buffer, {
      type: "buffer",
      cellDates: false,
      cellNF: false,
      cellStyles: false,
      sheetStubs: false,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { error: "No worksheets found in the XLSX file." };
    }

    rows = utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];

    log.info({ sheetName, totalRows: rows.length, fileName }, "XLSX parsed");
  } catch (err) {
    log.error({ err, fileName }, "XLSX parse failed");
    return {
      error:
        "Failed to parse the XLSX file. Please export it directly from Vyapar (Items Report → Export → Excel).",
    };
  }

  const nonBlankRows = rows.filter((r) =>
    (r as unknown[]).some((v) => v !== "" && v !== null && v !== undefined)
  );

  if (nonBlankRows.length < 2) {
    return {
      error:
        "The file must have a header row and at least one data row. Is this a valid Vyapar export?",
    };
  }

  // Normalise headers: lowercase, keep *, strip other special chars
  const headers = (nonBlankRows[0] as unknown[]).map((h) =>
    String(h ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9 ./*]/g, "")
      .trim()
  );

  const colName    = resolveCol(headers, ALIASES.name);
  const colBarcode = resolveCol(headers, ALIASES.barcode);
  const colCat     = resolveCol(headers, ALIASES.category);
  const colMrp     = resolveCol(headers, ALIASES.mrp);
  const colPrice   = resolveCol(headers, ALIASES.price);
  const colStock   = resolveCol(headers, ALIASES.stock);

  log.info(
    { colName, colBarcode, colCat, colMrp, colPrice, colStock, headers },
    "Column mapping resolved"
  );

  if (colName === -1 && colBarcode === -1) {
    return {
      error: `File must have an "Item name*" or "Item code" column. Detected headers: ${headers.join(", ")}`,
    };
  }
  if (colStock === -1) {
    return {
      error: `File must have a "Current stock quantity" column. Detected headers: ${headers.join(", ")}`,
    };
  }

  return { nonBlankRows, headers, colName, colBarcode, colCat, colMrp, colPrice, colStock };
}

// ── Core matching: maps one data row to a PreviewRow ─────────────────────────

function matchRow(
  cols: unknown[],
  rowNum: number,
  colName: number,
  colBarcode: number,
  colStock: number,
  ref: RefData
): PreviewRow {
  const vyaparName    = cell(cols, colName);
  const vyaparBarcode = cell(cols, colBarcode);

  // Priority 1 — barcode (Item code)
  if (vyaparBarcode) {
    const hit = ref.byBarcode.get(vyaparBarcode.toLowerCase());
    if (hit) {
      return { rowNum, vyaparName, vyaparBarcode, thinkitName: hit.name, matchMethod: "barcode", status: "matched" };
    }
  }

  // Priority 2 — exact name (case-insensitive)
  if (vyaparName) {
    const hit = ref.byExact.get(vyaparName.toLowerCase());
    if (hit) {
      return { rowNum, vyaparName, vyaparBarcode, thinkitName: hit.name, matchMethod: "exact", status: "matched" };
    }
  }

  // Priority 3 — normalized name (ignores spacing, special chars, unit notation)
  if (vyaparName) {
    const norm = normalizeName(vyaparName);
    if (norm) {
      const hit = ref.byNormalized.get(norm);
      if (hit) {
        return { rowNum, vyaparName, vyaparBarcode, thinkitName: hit.name, matchMethod: "normalized", status: "matched" };
      }
    }
  }

  // No match — explain why
  let notFoundReason: string;
  if (!vyaparBarcode && !vyaparName) {
    notFoundReason = "Both name and barcode are empty";
  } else if (vyaparBarcode && !ref.byBarcode.has(vyaparBarcode.toLowerCase())) {
    notFoundReason = vyaparName
      ? `Item code "${vyaparBarcode}" not in Thinkit; name "${vyaparName}" also unmatched`
      : `Item code "${vyaparBarcode}" not found in Thinkit`;
  } else {
    notFoundReason = `Name "${vyaparName}" not found in Thinkit (tried exact + normalized)`;
  }

  const rawStock = cell(cols, colStock);
  log.warn({ rowNum, vyaparName, vyaparBarcode, rawStock, notFoundReason }, "Row not matched");

  return {
    rowNum,
    vyaparName,
    vyaparBarcode,
    thinkitName: null,
    matchMethod: null,
    status: "not_found",
    notFoundReason,
  };
}

// ── GET /api/admin/inventory-sync/history ────────────────────────────────────

router.get(
  "/admin/inventory-sync/history",
  requireAdmin,
  async (_req, res): Promise<void> => {
    try {
      const logs = await db
        .select()
        .from(inventorySyncLogsTable)
        .orderBy(desc(inventorySyncLogsTable.syncedAt))
        .limit(30);
      res.json(logs);
    } catch (err) {
      log.error({ err }, "Failed to fetch sync history");
      res.status(500).json({ error: "Failed to load sync history" });
    }
  }
);

// ── GET /api/admin/inventory-sync/last ───────────────────────────────────────

router.get(
  "/admin/inventory-sync/last",
  requireAdmin,
  async (_req, res): Promise<void> => {
    try {
      const [last] = await db
        .select({
          syncedAt:        inventorySyncLogsTable.syncedAt,
          productsUpdated: inventorySyncLogsTable.productsUpdated,
          outOfStockCount: inventorySyncLogsTable.outOfStockCount,
          errorCount:      inventorySyncLogsTable.errorCount,
        })
        .from(inventorySyncLogsTable)
        .orderBy(desc(inventorySyncLogsTable.syncedAt))
        .limit(1);
      res.json(last ?? null);
    } catch (err) {
      log.error({ err }, "Failed to fetch last sync");
      res.status(500).json({ error: "Failed to load last sync info" });
    }
  }
);

// ── POST /api/admin/inventory-sync/preview ───────────────────────────────────
// Parses the XLSX and matches rows without writing to the database.

router.post(
  "/admin/inventory-sync/preview",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { xlsxBase64, fileName } = (req.body ?? {}) as {
      xlsxBase64?: unknown;
      fileName?: unknown;
    };

    if (typeof xlsxBase64 !== "string" || !xlsxBase64.trim()) {
      res.status(400).json({ error: "xlsxBase64 is required" });
      return;
    }

    const safeFileName =
      typeof fileName === "string" && fileName.trim() ? fileName.trim() : "upload.xlsx";

    log.info({ fileName: safeFileName }, "Preview request received");

    // Parse XLSX
    const parsed = parseXlsx(xlsxBase64, safeFileName);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { nonBlankRows, colName, colBarcode, colCat: _colCat, colMrp: _colMrp, colPrice: _colPrice, colStock } = parsed;

    // Load reference data
    const ref = await loadRefData();
    if ("error" in ref) {
      res.status(500).json({ error: ref.error });
      return;
    }

    // Process rows
    const dataRows = nonBlankRows.slice(1);
    let skippedBlank = 0;
    const previewRows: PreviewRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const cols   = dataRows[i] as unknown[];
      const rowNum = i + 2;

      const rawName    = cell(cols, colName);
      const rawBarcode = cell(cols, colBarcode);

      if (!rawName && !rawBarcode) { skippedBlank++; continue; }
      if (/^[-=*_]{2,}$/.test(rawName) || /^[-=*_]{2,}$/.test(rawBarcode)) { skippedBlank++; continue; }

      try {
        previewRows.push(matchRow(cols, rowNum, colName, colBarcode, colStock, ref));
      } catch (err) {
        log.warn({ rowNum, err }, "Preview row error — skipped");
        previewRows.push({
          rowNum,
          vyaparName: rawName,
          vyaparBarcode: rawBarcode,
          thinkitName: null,
          matchMethod: null,
          status: "not_found",
          notFoundReason: err instanceof Error ? err.message : "Unexpected error",
        });
      }
    }

    const matched  = previewRows.filter((r) => r.status === "matched").length;
    const notFound = previewRows.filter((r) => r.status === "not_found").length;

    log.info({ totalRows: dataRows.length, skippedBlank, matched, notFound }, "Preview complete");

    // Return summary + matched sample (first 5) + all unmatched rows
    const matchedSample = previewRows.filter((r) => r.status === "matched").slice(0, 5);
    const notFoundRows  = previewRows.filter((r) => r.status === "not_found");

    res.json({
      totalRows: dataRows.length - skippedBlank,
      skippedBlank,
      matched,
      notFound,
      matchedSample,
      notFoundRows,
    });
  }
);

// ── POST /api/admin/inventory-sync ───────────────────────────────────────────

router.post(
  "/admin/inventory-sync",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { xlsxBase64, fileName } = (req.body ?? {}) as {
      xlsxBase64?: unknown;
      fileName?: unknown;
    };

    if (typeof xlsxBase64 !== "string" || !xlsxBase64.trim()) {
      res.status(400).json({ error: "xlsxBase64 is required" });
      return;
    }

    const safeFileName =
      typeof fileName === "string" && fileName.trim() ? fileName.trim() : "upload.xlsx";

    const adminUser = (req.session.adminId as string | undefined) ?? "admin";

    log.info({ fileName: safeFileName, adminUser }, "Inventory sync started");

    // Parse XLSX
    const parsed = parseXlsx(xlsxBase64, safeFileName);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { nonBlankRows, colName, colBarcode, colCat, colMrp, colPrice, colStock } = parsed;

    // Load reference data
    const ref = await loadRefData();
    if ("error" in ref) {
      res.status(500).json({ error: ref.error });
      return;
    }

    // Process rows
    const dataRows = nonBlankRows.slice(1);
    let skippedBlank = 0;

    type SyncError = { row: number; name: string; reason: string };
    type PendingUpdate = {
      id: number;
      name: string;
      updates: Partial<typeof productsTable.$inferInsert>;
    };

    const errors: SyncError[]      = [];
    const pending: PendingUpdate[] = [];
    const notFoundRows: PreviewRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const cols   = dataRows[i] as unknown[];
      const rowNum = i + 2;

      const rawName    = cell(cols, colName);
      const rawBarcode = cell(cols, colBarcode);

      if (!rawName && !rawBarcode) { skippedBlank++; continue; }
      if (/^[-=*_]{2,}$/.test(rawName) || /^[-=*_]{2,}$/.test(rawBarcode)) { skippedBlank++; continue; }

      try {
        const matched = matchRow(cols, rowNum, colName, colBarcode, colStock, ref);

        if (matched.status === "not_found") {
          notFoundRows.push(matched);
          continue;
        }

        // Find the product ID from the match maps
        let productId: number | undefined;
        if (matched.matchMethod === "barcode" && rawBarcode) {
          productId = ref.byBarcode.get(rawBarcode.toLowerCase())?.id;
        }
        if (!productId && rawName) {
          productId = ref.byExact.get(rawName.toLowerCase())?.id
            ?? ref.byNormalized.get(normalizeName(rawName))?.id;
        }

        if (!productId) {
          notFoundRows.push({
            ...matched,
            status: "not_found",
            notFoundReason: `"${matched.thinkitName ?? matched.vyaparName}" matched by name but could not be located in the database — please re-sync`,
          });
          continue;
        }

        // Parse stock quantity — required
        const rawStock = cell(cols, colStock);
        const stockQty = parseInt(rawStock.replace(/[^0-9-]/g, ""), 10);

        if (isNaN(stockQty) || stockQty < 0) {
          errors.push({ row: rowNum, name: rawName || rawBarcode, reason: `Invalid stock value: "${rawStock}"` });
          log.warn({ rowNum, rawName, rawStock }, "Invalid stock value — row skipped");
          continue;
        }

        const available = stockQty - ref.safetyBuffer;
        const updates: Partial<typeof productsTable.$inferInsert> = {
          stockQty,
          inStock: available > 0,
        };

        if (colMrp >= 0) {
          const mrp = parseMoney(cell(cols, colMrp));
          if (!isNaN(mrp)) updates.mrp = mrp;
        }

        if (colPrice >= 0) {
          const price = parseMoney(cell(cols, colPrice));
          if (!isNaN(price)) updates.price = price;
        }

        if (colCat >= 0) {
          const rawCat = cell(cols, colCat);
          if (rawCat) {
            const categoryId = ref.byCategoryName.get(rawCat.toLowerCase());
            if (categoryId) updates.categoryId = categoryId;
          }
        }

        pending.push({ id: productId, name: matched.thinkitName ?? rawName, updates });
      } catch (rowErr) {
        errors.push({
          row: rowNum,
          name: rawName || rawBarcode || `row ${rowNum}`,
          reason: rowErr instanceof Error ? rowErr.message : "Unexpected error",
        });
        log.warn({ rowNum, rawName, rawBarcode, err: rowErr }, "Row processing error — skipped");
      }
    }

    const totalRows     = dataRows.length - skippedBlank;
    const notFoundCount = notFoundRows.length;

    log.info(
      { totalRows, pendingUpdates: pending.length, notFoundCount, skippedBlank, errorCount: errors.length },
      "Row processing complete"
    );

    // Apply all updates in one transaction
    let productsUpdated = 0;
    let outOfStockCount = 0;

    try {
      await db.transaction(async (tx) => {
        for (const { id, updates } of pending) {
          await tx.update(productsTable).set(updates).where(eq(productsTable.id, id));
          productsUpdated++;
          if (updates.inStock === false) outOfStockCount++;
        }
      });

      log.info({ productsUpdated, outOfStockCount }, "Database transaction committed");
    } catch (txErr) {
      log.error({ err: txErr }, "Database transaction failed");
      res.status(500).json({
        error:
          "Database update failed. The file was parsed correctly but the updates could not be saved. Please try again.",
      });
      return;
    }

    // Save sync log
    try {
      const [logEntry] = await db
        .insert(inventorySyncLogsTable)
        .values({
          fileName: safeFileName,
          adminUser,
          productsUpdated,
          newProducts: 0,
          outOfStockCount,
          errorCount: errors.length,
          errors: errors.slice(0, 50),
        })
        .returning();

      log.info(
        { logId: logEntry?.id, productsUpdated, outOfStockCount, errorCount: errors.length, notFoundCount },
        "Sync log saved"
      );

      res.json({
        success: true,
        summary: {
          totalRows,
          skippedBlank,
          productsUpdated,
          outOfStockCount,
          errorCount: errors.length,
          notFoundCount,
        },
        errors: errors.slice(0, 10),
        notFoundProducts: notFoundRows.slice(0, 50),
        log: logEntry,
      });
    } catch (logErr) {
      log.error({ err: logErr }, "Failed to save sync log (sync itself succeeded)");
      res.json({
        success: true,
        summary: {
          totalRows,
          skippedBlank,
          productsUpdated,
          outOfStockCount,
          errorCount: errors.length,
          notFoundCount,
        },
        errors: errors.slice(0, 10),
        notFoundProducts: notFoundRows.slice(0, 50),
        log: null,
      });
    }
  }
);

export default router;
