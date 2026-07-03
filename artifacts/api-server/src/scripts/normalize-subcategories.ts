/**
 * One-time (idempotent) migration: normalize all products.subcategory values.
 *
 * Rules applied (mirrors the normalizeSubcategory() helper in routes/admin/products.ts):
 *   1. Blank / whitespace-only values → NULL
 *   2. Non-null values   → initcap(trim(…))   e.g. " rice " → "Rice", "ATTA" → "Atta"
 *
 * Safe to run more than once — the WHERE clauses skip already-correct rows.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server tsx src/scripts/normalize-subcategories.ts
 */

import { db, productsTable } from "@workspace/db";
import { sql, isNull, ne, not } from "drizzle-orm";

async function run() {
  console.log("→ Step 1: set blank subcategories to NULL …");
  const blanked = await db.execute(sql`
    UPDATE products
    SET    subcategory = NULL
    WHERE  subcategory IS NOT NULL
      AND  trim(subcategory) = ''
  `);
  console.log(`   ${blanked.rowCount ?? 0} row(s) updated`);

  console.log("→ Step 2: title-case + trim non-null subcategories …");
  const titleCased = await db.execute(sql`
    UPDATE products
    SET    subcategory = initcap(trim(subcategory))
    WHERE  subcategory IS NOT NULL
      AND  trim(subcategory) != ''
      AND  subcategory IS DISTINCT FROM initcap(trim(subcategory))
  `);
  console.log(`   ${titleCased.rowCount ?? 0} row(s) updated`);

  console.log("✓ Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
