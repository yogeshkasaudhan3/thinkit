import { Router, type IRouter } from "express";
import { read, utils } from "xlsx";
import {
  db,
  productsTable,
  storeSettingsTable,
  inventorySyncLogsTable,
  adminUsersTable,
  categoriesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";

const router: IRouter = Router();

// ── Vyapar Gold Desktop column aliases (all lowercase, priority order) ────────

const ALIASES = {
  name: [
    "item name*",           // Vyapar Gold Desktop exact
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
    "item code",            // Vyapar Gold Desktop exact
    "barcode",
    "barcode no",
    "barcode no.",
    "barcode number",
    "sku",
    "product code",
    "code",
  ],
  category: [
    "category",             // Vyapar Gold Desktop exact
    "category name",
    "item category",
    "product category",
  ],
  mrp: [
    "default mrp",          // Vyapar Gold Desktop exact
    "mrp",
    "m.r.p.",
    "m.r.p",
    "maximum retail price",
    "max retail price",
  ],
  price: [
    "sale price",           // Vyapar Gold Desktop exact
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

function safeNum(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.]/g, ""));
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/admin/inventory-sync/history
router.get(
  "/admin/inventory-sync/history",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const logs = await db
      .select()
      .from(inventorySyncLogsTable)
      .orderBy(desc(inventorySyncLogsTable.syncedAt))
      .limit(30);
    res.json(logs);
  }
);

// GET /api/admin/inventory-sync/last
router.get(
  "/admin/inventory-sync/last",
  requireAdmin,
  async (_req, res): Promise<void> => {
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
  }
);

// POST /api/admin/inventory-sync
router.post(
  "/admin/inventory-sync",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { xlsxBase64, fileName } = req.body as {
      xlsxBase64?: unknown;
      fileName?: unknown;
    };

    if (typeof xlsxBase64 !== "string" || !xlsxBase64.trim()) {
      res.status(400).json({ error: "xlsxBase64 is required" });
      return;
    }

    // ── Parse XLSX ─────────────────────────────────────────────────────────
    let rows: string[][];
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
        res.status(400).json({ error: "No worksheets found in the XLSX file." });
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      // raw:false ensures numbers are formatted as strings; defval='' fills empty cells
      rows = utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      }) as string[][];
    } catch {
      res.status(400).json({
        error:
          "Failed to parse the XLSX file. Please export it directly from Vyapar (Items Report → Export → Excel).",
      });
      return;
    }

    if (rows.length < 2) {
      res.status(400).json({
        error:
          "The file must have a header row and at least one data row. Is this a valid Vyapar export?",
      });
      return;
    }

    // Normalise headers: lowercase, keep * (for "Item name*"), strip other special chars
    const headers = rows[0].map((h) =>
      String(h)
        .toLowerCase()
        .replace(/[^a-z0-9 ./*]/g, "")
        .trim()
    );
    const dataRows = rows.slice(1);

    const colName = resolveCol(headers, ALIASES.name);
    const colBarcode = resolveCol(headers, ALIASES.barcode);
    const colCategory = resolveCol(headers, ALIASES.category);
    const colMrp = resolveCol(headers, ALIASES.mrp);
    const colPrice = resolveCol(headers, ALIASES.price);
    const colStock = resolveCol(headers, ALIASES.stock);

    if (colName === -1 && colBarcode === -1) {
      res.status(400).json({
        error: `File must have an 'Item name*' or 'Item code' column. Detected headers: ${headers.join(", ")}`,
      });
      return;
    }
    if (colStock === -1) {
      res.status(400).json({
        error: `File must have a 'Current stock quantity' column. Detected headers: ${headers.join(", ")}`,
      });
      return;
    }

    // ── Resolve admin username ─────────────────────────────────────────────
    const adminId = req.session.adminId as number | undefined;
    const [admin] = adminId
      ? await db
          .select({ username: adminUsersTable.username })
          .from(adminUsersTable)
          .where(eq(adminUsersTable.id, adminId))
      : [];
    const adminUser = admin?.username ?? "admin";

    // ── Fetch safety buffer ────────────────────────────────────────────────
    await db.insert(storeSettingsTable).values({ id: 1 }).onConflictDoNothing();
    const [settings] = await db
      .select({ inventorySafetyBuffer: storeSettingsTable.inventorySafetyBuffer })
      .from(storeSettingsTable);
    const safetyBuffer = settings?.inventorySafetyBuffer ?? 2;

    // ── Load all products into memory maps ─────────────────────────────────
    const allProducts = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        barcode: productsTable.barcode,
      })
      .from(productsTable);

    const byBarcode = new Map<string, number>();
    const byName = new Map<string, number>();
    for (const p of allProducts) {
      if (p.barcode?.trim()) byBarcode.set(p.barcode.trim().toLowerCase(), p.id);
      byName.set(p.name.trim().toLowerCase(), p.id);
    }

    // ── Load all categories into a name → id map ───────────────────────────
    const allCategories = await db
      .select({ id: categoriesTable.id, name: categoriesTable.name })
      .from(categoriesTable);
    const byCategoryName = new Map<string, string>();
    for (const c of allCategories) {
      byCategoryName.set(c.name.trim().toLowerCase(), String(c.id));
    }

    // ── Process rows ───────────────────────────────────────────────────────
    type SyncError = { row: number; name: string; reason: string };
    type ProductUpdate = {
      id: number;
      updates: Partial<typeof productsTable.$inferInsert>;
    };

    let productsUpdated = 0;
    let outOfStockCount = 0;
    let errorCount = 0;
    const errors: SyncError[] = [];
    const pendingUpdates: ProductUpdate[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const cols = dataRows[i];
      const rowNum = i + 2; // 1-indexed + header offset

      const csvName = colName >= 0 ? String(cols[colName] ?? "").trim() : "";
      const csvBarcode = colBarcode >= 0 ? String(cols[colBarcode] ?? "").trim() : "";
      const csvStockRaw = String(cols[colStock] ?? "").trim();

      if (!csvName && !csvBarcode) continue; // blank row

      // Priority 1: barcode; Priority 2: name (case-insensitive)
      let productId: number | undefined;
      if (csvBarcode) productId = byBarcode.get(csvBarcode.toLowerCase());
      if (!productId && csvName) productId = byName.get(csvName.toLowerCase());
      if (!productId) continue; // not in Thinkit — skip silently

      // Parse stock quantity
      const stockQty = parseInt(csvStockRaw.replace(/[^0-9-]/g, ""), 10);
      if (isNaN(stockQty) || stockQty < 0) {
        errorCount++;
        errors.push({
          row: rowNum,
          name: csvName || csvBarcode,
          reason: `Invalid stock value: "${csvStockRaw}"`,
        });
        continue;
      }

      const available = stockQty - safetyBuffer;
      const updates: Partial<typeof productsTable.$inferInsert> = {
        stockQty,
        inStock: available > 0,
      };

      // Optional: update MRP
      if (colMrp >= 0) {
        const mrp = Math.round(safeNum(String(cols[colMrp] ?? "")));
        if (!isNaN(mrp) && mrp > 0) updates.mrp = mrp;
      }

      // Optional: update selling price
      if (colPrice >= 0) {
        const price = Math.round(safeNum(String(cols[colPrice] ?? "")));
        if (!isNaN(price) && price > 0) updates.price = price;
      }

      // Optional: update category (if CSV has it and it matches an existing Thinkit category)
      if (colCategory >= 0) {
        const csvCategory = String(cols[colCategory] ?? "").trim();
        if (csvCategory) {
          const categoryId = byCategoryName.get(csvCategory.toLowerCase());
          if (categoryId) updates.categoryId = categoryId;
        }
      }

      pendingUpdates.push({ id: productId, updates });
    }

    // ── Apply all updates in a single transaction (fast for 3 000+ rows) ──
    try {
      await db.transaction(async (tx) => {
        for (const { id, updates } of pendingUpdates) {
          await tx
            .update(productsTable)
            .set(updates)
            .where(eq(productsTable.id, id));
          productsUpdated++;
          if (updates.inStock === false) outOfStockCount++;
        }
      });
    } catch {
      res.status(500).json({ error: "Database transaction failed during sync." });
      return;
    }

    // ── Save sync log ──────────────────────────────────────────────────────
    const safeFileName =
      typeof fileName === "string" && fileName.trim()
        ? fileName.trim()
        : "upload.xlsx";

    const [log] = await db
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

    res.json({
      success: true,
      summary: { productsUpdated, newProducts: 0, outOfStockCount, errorCount },
      errors: errors.slice(0, 10),
      log,
    });
  }
);

export default router;
