import { Router, type IRouter } from "express";
import {
  db,
  productsTable,
  storeSettingsTable,
  inventorySyncLogsTable,
  adminUsersTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";

const router: IRouter = Router();

// ── RFC 4180 CSV parser ───────────────────────────────────────────────────────

function parseCsvContent(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Normalise line endings; add sentinel so the last row is always flushed
  const content = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n") + "\n";

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1] ?? "";

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field.trim());
        field = "";
      } else if (ch === "\n") {
        row.push(field.trim());
        if (row.some((f) => f !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }

  return rows;
}

// ── Vyapar column aliases (all lowercase) ────────────────────────────────────

const ALIASES = {
  name: [
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
    "barcode",
    "barcode no",
    "barcode no.",
    "barcode number",
    "item code",
    "sku",
    "product code",
    "code",
  ],
  mrp: ["mrp", "m.r.p.", "m.r.p", "maximum retail price", "max retail price"],
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
    const { csvContent, fileName } = req.body as {
      csvContent?: unknown;
      fileName?: unknown;
    };

    if (typeof csvContent !== "string" || !csvContent.trim()) {
      res.status(400).json({ error: "csvContent is required" });
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

    // ── Parse CSV ──────────────────────────────────────────────────────────
    const rawRows = parseCsvContent(csvContent);
    if (rawRows.length < 2) {
      res
        .status(400)
        .json({
          error:
            "CSV must have a header row and at least one data row. Is this a valid Vyapar export?",
        });
      return;
    }

    // Normalise headers: lowercase, strip special chars except spaces and slashes
    const headers = rawRows[0].map((h) =>
      h
        .toLowerCase()
        .replace(/[^a-z0-9 ./]/g, "")
        .trim()
    );
    const dataRows = rawRows.slice(1);

    const colName = resolveCol(headers, ALIASES.name);
    const colBarcode = resolveCol(headers, ALIASES.barcode);
    const colMrp = resolveCol(headers, ALIASES.mrp);
    const colPrice = resolveCol(headers, ALIASES.price);
    const colStock = resolveCol(headers, ALIASES.stock);

    if (colName === -1 && colBarcode === -1) {
      res.status(400).json({
        error: `CSV must have an 'Item Name' or 'Barcode' column. Detected headers: ${headers.join(", ")}`,
      });
      return;
    }
    if (colStock === -1) {
      res.status(400).json({
        error: `CSV must have a stock quantity column (e.g. 'Stock Qty'). Detected headers: ${headers.join(", ")}`,
      });
      return;
    }

    // ── Fetch safety buffer ────────────────────────────────────────────────
    await db
      .insert(storeSettingsTable)
      .values({ id: 1 })
      .onConflictDoNothing();
    const [settings] = await db
      .select({ inventorySafetyBuffer: storeSettingsTable.inventorySafetyBuffer })
      .from(storeSettingsTable);
    const safetyBuffer = settings?.inventorySafetyBuffer ?? 2;

    // ── Load all products into memory ──────────────────────────────────────
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

    // ── Process rows ───────────────────────────────────────────────────────
    type SyncError = { row: number; name: string; reason: string };
    let productsUpdated = 0;
    let outOfStockCount = 0;
    let errorCount = 0;
    const errors: SyncError[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const cols = dataRows[i];
      const rowNum = i + 2; // 1-indexed + header offset

      const csvName = colName >= 0 ? (cols[colName] ?? "").trim() : "";
      const csvBarcode = colBarcode >= 0 ? (cols[colBarcode] ?? "").trim() : "";
      const csvStockRaw = (cols[colStock] ?? "").trim();

      if (!csvName && !csvBarcode) continue; // blank row

      // Priority 1: barcode; Priority 2: name
      let productId: number | undefined;
      if (csvBarcode) productId = byBarcode.get(csvBarcode.toLowerCase());
      if (!productId && csvName)
        productId = byName.get(csvName.toLowerCase());
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
        const raw = (cols[colMrp] ?? "").trim().replace(/[^0-9.]/g, "");
        const mrp = Math.round(parseFloat(raw));
        if (!isNaN(mrp) && mrp > 0) updates.mrp = mrp;
      }
      // Optional: update selling price
      if (colPrice >= 0) {
        const raw = (cols[colPrice] ?? "").trim().replace(/[^0-9.]/g, "");
        const price = Math.round(parseFloat(raw));
        if (!isNaN(price) && price > 0) updates.price = price;
      }

      try {
        await db
          .update(productsTable)
          .set(updates)
          .where(eq(productsTable.id, productId));
        productsUpdated++;
        if (!updates.inStock) outOfStockCount++;
      } catch {
        errorCount++;
        errors.push({
          row: rowNum,
          name: csvName || csvBarcode,
          reason: "Database update failed",
        });
      }
    }

    // ── Save sync log ──────────────────────────────────────────────────────
    const safeFileName =
      typeof fileName === "string" && fileName.trim()
        ? fileName.trim()
        : "upload.csv";

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
