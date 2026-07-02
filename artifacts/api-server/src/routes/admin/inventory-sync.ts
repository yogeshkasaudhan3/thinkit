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

/** Parse a money/numeric string to a positive integer (paise-rounded), or NaN. */
function parseMoney(raw: string): number {
  const n = Math.round(parseFloat(raw.replace(/[^0-9.]/g, "")));
  return isFinite(n) && n > 0 ? n : NaN;
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
          syncedAt: inventorySyncLogsTable.syncedAt,
          productsUpdated: inventorySyncLogsTable.productsUpdated,
          outOfStockCount: inventorySyncLogsTable.outOfStockCount,
          errorCount: inventorySyncLogsTable.errorCount,
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

// ── POST /api/admin/inventory-sync ───────────────────────────────────────────

router.post(
  "/admin/inventory-sync",
  requireAdmin,
  async (req, res): Promise<void> => {
    // ── 1. Validate request body ───────────────────────────────────────────
    const { xlsxBase64, fileName } = (req.body ?? {}) as {
      xlsxBase64?: unknown;
      fileName?: unknown;
    };

    if (typeof xlsxBase64 !== "string" || !xlsxBase64.trim()) {
      res.status(400).json({ error: "xlsxBase64 is required" });
      return;
    }

    const safeFileName =
      typeof fileName === "string" && fileName.trim()
        ? fileName.trim()
        : "upload.xlsx";

    // req.session.adminId holds the username string set at login — use directly
    const adminUser = (req.session.adminId as string | undefined) ?? "admin";

    log.info({ fileName: safeFileName, adminUser }, "Inventory sync upload received");

    // ── 2. Parse XLSX ──────────────────────────────────────────────────────
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
        log.warn({ fileName: safeFileName }, "XLSX has no worksheets");
        res.status(400).json({ error: "No worksheets found in the XLSX file." });
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      // raw:false formats numbers as strings; defval:'' fills empty cells
      rows = utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      }) as unknown[][];

      log.info(
        { sheetName, totalRows: rows.length, fileName: safeFileName },
        "XLSX parsed"
      );
    } catch (err) {
      log.error({ err, fileName: safeFileName }, "XLSX parse failed");
      res.status(400).json({
        error:
          "Failed to parse the XLSX file. Please export it directly from Vyapar (Items Report → Export → Excel).",
      });
      return;
    }

    // Filter out fully-blank rows early so the header check is reliable
    const nonBlankRows = rows.filter((r) =>
      (r as unknown[]).some((v) => v !== "" && v !== null && v !== undefined)
    );

    if (nonBlankRows.length < 2) {
      res.status(400).json({
        error:
          "The file must have a header row and at least one data row. Is this a valid Vyapar export?",
      });
      return;
    }

    // ── 3. Resolve column indices ──────────────────────────────────────────
    // Normalise: lowercase, keep * (for "Item name*"), strip other special chars
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
      res.status(400).json({
        error: `File must have an "Item name*" or "Item code" column. Detected headers: ${headers.join(", ")}`,
      });
      return;
    }
    if (colStock === -1) {
      res.status(400).json({
        error: `File must have a "Current stock quantity" column. Detected headers: ${headers.join(", ")}`,
      });
      return;
    }

    // ── 4. Load reference data ─────────────────────────────────────────────
    let safetyBuffer = 2;
    try {
      await db.insert(storeSettingsTable).values({ id: 1 }).onConflictDoNothing();
      const [settings] = await db
        .select({ inventorySafetyBuffer: storeSettingsTable.inventorySafetyBuffer })
        .from(storeSettingsTable);
      safetyBuffer = settings?.inventorySafetyBuffer ?? 2;
    } catch (err) {
      log.warn({ err }, "Could not read safety buffer — using default of 2");
    }

    // Load all products into memory for O(1) matching
    let allProducts: { id: number; name: string; barcode: string | null }[];
    try {
      allProducts = await db
        .select({ id: productsTable.id, name: productsTable.name, barcode: productsTable.barcode })
        .from(productsTable);
    } catch (err) {
      log.error({ err }, "Failed to load products from database");
      res.status(500).json({ error: "Failed to load product catalogue. Please try again." });
      return;
    }

    const byBarcode = new Map<string, number>();
    const byName    = new Map<string, number>();
    for (const p of allProducts) {
      if (p.barcode?.trim()) byBarcode.set(p.barcode.trim().toLowerCase(), p.id);
      byName.set(p.name.trim().toLowerCase(), p.id);
    }

    // Load all categories for category-name → categoryId mapping
    let allCategories: { id: number; name: string }[];
    try {
      allCategories = await db
        .select({ id: categoriesTable.id, name: categoriesTable.name })
        .from(categoriesTable);
    } catch (err) {
      log.warn({ err }, "Failed to load categories — category updates will be skipped");
      allCategories = [];
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

    // ── 5. Process data rows ───────────────────────────────────────────────
    type SyncError = { row: number; name: string; reason: string };
    type PendingUpdate = {
      id: number;
      updates: Partial<typeof productsTable.$inferInsert>;
    };

    let skippedBlank     = 0;
    let skippedUnmatched = 0;
    let errorCount       = 0;
    const errors: SyncError[]       = [];
    const pending: PendingUpdate[]  = [];

    const dataRows = nonBlankRows.slice(1);

    for (let i = 0; i < dataRows.length; i++) {
      const cols  = dataRows[i] as unknown[];
      const rowNum = i + 2; // 1-indexed + header offset

      // Skip separator / blank rows — any row whose "name" and "barcode" cells
      // are both empty or look like "---" / "===" dividers
      const rawName    = cell(cols, colName);
      const rawBarcode = cell(cols, colBarcode);

      if (!rawName && !rawBarcode) {
        skippedBlank++;
        continue;
      }

      // Treat rows that are clearly section headers / separators
      if (/^[-=*_]{2,}$/.test(rawName) || /^[-=*_]{2,}$/.test(rawBarcode)) {
        skippedBlank++;
        continue;
      }

      // Per-row try/catch — a bad row never crashes the whole sync
      try {
        // Priority 1: barcode match; Priority 2: name match (case-insensitive)
        let productId: number | undefined;
        if (rawBarcode) productId = byBarcode.get(rawBarcode.toLowerCase());
        if (!productId && rawName) productId = byName.get(rawName.toLowerCase());

        if (!productId) {
          skippedUnmatched++;
          log.warn({ rowNum, rawName, rawBarcode }, "Row skipped — no matching product in Thinkit");
          continue;
        }

        // Stock quantity — required
        const rawStock = cell(cols, colStock);
        const stockQty = parseInt(rawStock.replace(/[^0-9-]/g, ""), 10);

        if (isNaN(stockQty) || stockQty < 0) {
          errorCount++;
          errors.push({ row: rowNum, name: rawName || rawBarcode, reason: `Invalid stock value: "${rawStock}"` });
          continue;
        }

        const available = stockQty - safetyBuffer;
        const updates: Partial<typeof productsTable.$inferInsert> = {
          stockQty,
          inStock: available > 0,
        };

        // MRP — optional
        if (colMrp >= 0) {
          const mrp = parseMoney(cell(cols, colMrp));
          if (!isNaN(mrp)) updates.mrp = mrp;
        }

        // Selling price — optional
        if (colPrice >= 0) {
          const price = parseMoney(cell(cols, colPrice));
          if (!isNaN(price)) updates.price = price;
        }

        // Category — optional; only update when it matches a known Thinkit category
        if (colCat >= 0) {
          const rawCat = cell(cols, colCat);
          if (rawCat) {
            const categoryId = byCategoryName.get(rawCat.toLowerCase());
            if (categoryId) updates.categoryId = categoryId;
          }
        }

        pending.push({ id: productId, updates });
      } catch (rowErr) {
        // Never let one malformed row abort the entire sync
        errorCount++;
        errors.push({
          row: rowNum,
          name: rawName || rawBarcode || `row ${rowNum}`,
          reason: rowErr instanceof Error ? rowErr.message : "Unexpected error processing row",
        });
        log.warn({ rowNum, rawName, rawBarcode, err: rowErr }, "Row processing error — skipped");
      }
    }

    log.info(
      { totalDataRows: dataRows.length, pendingUpdates: pending.length, skippedBlank, skippedUnmatched, errorCount },
      "Row processing complete"
    );

    // ── 6. Apply all updates in a single transaction ───────────────────────
    let productsUpdated = 0;
    let outOfStockCount = 0;

    try {
      await db.transaction(async (tx) => {
        for (const { id, updates } of pending) {
          await tx
            .update(productsTable)
            .set(updates)
            .where(eq(productsTable.id, id));
          productsUpdated++;
          if (updates.inStock === false) outOfStockCount++;
        }
      });

      log.info({ productsUpdated, outOfStockCount }, "Database transaction committed");
    } catch (txErr) {
      log.error({ err: txErr }, "Database transaction failed");
      res.status(500).json({
        error: "Database update failed. The file was parsed correctly but the updates could not be saved. Please try again.",
      });
      return;
    }

    // ── 7. Save sync log ───────────────────────────────────────────────────
    try {
      const [logEntry] = await db
        .insert(inventorySyncLogsTable)
        .values({
          fileName: safeFileName,
          adminUser,
          productsUpdated,
          newProducts: 0,
          outOfStockCount,
          errorCount,
          errors: errors.slice(0, 50),
        })
        .returning();

      log.info(
        { logId: logEntry?.id, productsUpdated, outOfStockCount, errorCount, fileName: safeFileName },
        "Sync log saved"
      );

      res.json({
        success: true,
        summary: { productsUpdated, newProducts: 0, outOfStockCount, errorCount },
        errors: errors.slice(0, 10),
        log: logEntry,
      });
    } catch (logErr) {
      // The sync itself succeeded — don't fail the response just because logging failed
      log.error({ err: logErr }, "Failed to save sync log (sync itself succeeded)");
      res.json({
        success: true,
        summary: { productsUpdated, newProducts: 0, outOfStockCount, errorCount },
        errors: errors.slice(0, 10),
        log: null,
      });
    }
  }
);

export default router;
