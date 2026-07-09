-- Product table indexes applied 2026-07-09
-- These were applied via executeSql (drizzle-kit push requires a TTY).
-- Re-run this file against any new database to reproduce the index set.
-- Drizzle schema (lib/db/src/schema/products.ts) declares the btree subset
-- via the index() builder; trigram indexes require raw SQL.

-- pg_trgm extension (required for GIN trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Btree indexes (also declared in Drizzle schema)
CREATE INDEX IF NOT EXISTS idx_products_enabled       ON products(enabled);
CREATE INDEX IF NOT EXISTS idx_products_category_id   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_enabled_cat   ON products(enabled, category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory   ON products(subcategory) WHERE subcategory IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_best_seller   ON products(is_best_seller) WHERE is_best_seller = true;
CREATE INDEX IF NOT EXISTS idx_products_dwarika       ON products(is_dwarika_special) WHERE is_dwarika_special = true;
CREATE INDEX IF NOT EXISTS idx_products_sku           ON products(sku)     WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode       ON products(barcode) WHERE barcode IS NOT NULL;

-- GIN trigram indexes for ILIKE search on name and brand
-- Not expressible via Drizzle's index() builder — raw SQL only.
CREATE INDEX IF NOT EXISTS idx_products_name_trgm  ON products USING gin(name  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING gin(brand gin_trgm_ops);
