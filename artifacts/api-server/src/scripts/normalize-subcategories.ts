/**
 * One-time (idempotent) migration: normalize subcategory values in both
 * the products table and the subcategory_definitions master list.
 *
 * Rules applied (mirrors the normalizeSubcategory() helper in routes/admin/products.ts):
 *   1. Blank / whitespace-only values → NULL  (products only)
 *   2. Non-null values   → initcap(trim(…))   e.g. " rice " → "Rice", "ATTA" → "Atta"
 *
 * Safe to run more than once — the WHERE clauses skip already-correct rows.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server tsx src/scripts/normalize-subcategories.ts
 */

import { db, productsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  // ── Products table ───────────────────────────────────────────────────────
  console.log("→ [products] Step 1: set blank subcategories to NULL …");
  const blanked = await db.execute(sql`
    UPDATE products
    SET    subcategory = NULL
    WHERE  subcategory IS NOT NULL
      AND  trim(subcategory) = ''
  `);
  console.log(`   ${blanked.rowCount ?? 0} row(s) updated`);

  console.log("→ [products] Step 2: title-case + trim non-null subcategories …");
  const titleCasedProducts = await db.execute(sql`
    UPDATE products
    SET    subcategory = initcap(trim(subcategory))
    WHERE  subcategory IS NOT NULL
      AND  trim(subcategory) != ''
      AND  subcategory IS DISTINCT FROM initcap(trim(subcategory))
  `);
  console.log(`   ${titleCasedProducts.rowCount ?? 0} row(s) updated`);

  // ── subcategory_definitions master list ──────────────────────────────────
  console.log("→ [subcategory_definitions] Normalizing name column …");
  const titleCasedDefs = await db.execute(sql`
    UPDATE subcategory_definitions
    SET    name = initcap(trim(name))
    WHERE  name IS DISTINCT FROM initcap(trim(name))
  `);
  console.log(`   ${titleCasedDefs.rowCount ?? 0} row(s) updated`);

  console.log("✓ Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
