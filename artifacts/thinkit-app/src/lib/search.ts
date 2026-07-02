/**
 * Thinkit Fuzzy Search Engine
 *
 * Pipeline:
 *   1. Normalize query (alias map: aata→atta, ashirwad→aashirvaad, …)
 *   2. Run Fuse.js on enriched documents (name + brand + category + subcats + keywords)
 *   3. Split results into "good" (score ≤ EXACT_THRESHOLD) and "fuzzy" (score ≤ FUZZY_THRESHOLD)
 *   4. If zero results → return best-seller fallback with isFallback flag
 *
 * Usage:
 *   // Build once when products are available, then call freely:
 *   const engine = createSearchEngine(products);
 *   const result = engine('atta');
 *
 *   // Or one-shot (rebuilds index every call — fine for small catalogs):
 *   const result = searchProducts('atta', products);
 */

import Fuse from 'fuse.js';
import { CATEGORIES, type Product } from './mockData';

// ─── Thresholds ────────────────────────────────────────────────────────────────
const EXACT_THRESHOLD = 0.35;
const FUZZY_THRESHOLD = 0.55;

// ─── Alias / normalisation map ─────────────────────────────────────────────────
const ALIASES: Record<string, string> = {
  // Atta / grains
  aata: 'atta', aatta: 'atta', wheat: 'atta', gehu: 'atta',
  gehun: 'atta', maida: 'atta',
  // Rice
  chawal: 'rice', chaawal: 'rice', basmati: 'rice',
  // Ghee / oil
  ghee: 'ghee', desi: 'ghee', tel: 'oil', tael: 'oil',
  sarson: 'mustard', sarso: 'mustard',
  // Dairy
  doodh: 'milk', dudh: 'milk', makkhan: 'butter', makhan: 'butter',
  panir: 'paneer', dahi: 'curd', lassi: 'milk',
  // Spices
  haldi: 'turmeric', mirch: 'chilli', jeera: 'cumin',
  dhania: 'coriander', garam: 'garam masala',
  // Brands (misspellings)
  ashirwad: 'aashirvaad', ashirvaad: 'aashirvaad', aashirvad: 'aashirvaad',
  aseervaad: 'aashirvaad',
  magi: 'maggi', magee: 'maggi', maagi: 'maggi', noodles: 'maggi',
  // Beverages / cold drinks
  coldrink: 'cold drinks', colddrink: 'cold drinks', 'cold drink': 'cold drinks',
  pepsi: 'cold drinks', cola: 'cold drinks', soda: 'cold drinks',
  chai: 'tea', chaye: 'tea', chay: 'tea', cofee: 'coffee', coffe: 'coffee',
  // Personal care
  sampoo: 'shampoo', sampu: 'shampoo', shampo: 'shampoo',
  sabun: 'soap', saboon: 'soap',
  toothpast: 'toothpaste', tothpaste: 'toothpaste', paste: 'toothpaste',
  // Home care
  detarjent: 'detergent', deterjent: 'detergent', detarjant: 'detergent',
  washin: 'detergent', washing: 'detergent',
  // Biscuits / snacks
  biskut: 'biscuits', biskit: 'biscuits', namkeen: 'snacks', chips: 'snacks',
  // Pooja
  agarbati: 'agarbatti', agarbathi: 'agarbatti', incense: 'agarbatti',
  // Dry fruits
  badam: 'almonds', kaju: 'cashews', kishmish: 'raisins',
  // Baby
  diaper: 'diapers', nappy: 'diapers',
};

function normalizeQuery(raw: string): string {
  const q = raw.trim().toLowerCase();
  return ALIASES[q] ?? q;
}

// ─── Enriched document ────────────────────────────────────────────────────────

interface SearchDoc {
  product: Product;
  name: string;
  brand: string;
  sku: string;
  category: string;
  subcats: string;
  keywords: string;
}

/**
 * Per-product keyword hints for common alternate names.
 * Keyed by a stable string that the admin is likely to use as part of the name.
 * Falls back to empty string for products with no entry.
 */
function deriveKeywords(p: Product): string {
  const nameLower = p.name.toLowerCase();
  const brandLower = p.brand.toLowerCase();

  const hints: string[] = [];

  if (nameLower.includes('atta') || nameLower.includes('flour'))  hints.push('gehu wheat flour');
  if (nameLower.includes('rice') || nameLower.includes('basmati')) hints.push('chawal chaawal basmati');
  if (nameLower.includes('butter'))  hints.push('makhan makkhan dairy');
  if (nameLower.includes('bread'))   hints.push('double roti whole wheat');
  if (nameLower.includes('ghee'))    hints.push('desi ghee pure');
  if (nameLower.includes('oil'))     hints.push('tel refined sunflower sarson');
  if (nameLower.includes('milk'))    hints.push('doodh dudh dairy');
  if (nameLower.includes('tea'))     hints.push('chai chaye chay beverage drink');
  if (nameLower.includes('coffee'))  hints.push('cofee coffe beverage coldrink cold drink');
  if (nameLower.includes('noodle') || brandLower.includes('maggi')) hints.push('magi magee two minute');
  if (nameLower.includes('biscuit') || nameLower.includes('cracker')) hints.push('biskut biskit glucose');
  if (nameLower.includes('masala') || nameLower.includes('spice'))  hints.push('haldi mirch garam masala');
  if (nameLower.includes('turmeric')) hints.push('haldi powder');
  if (nameLower.includes('detergent') || nameLower.includes('washing')) hints.push('washin kapda detarjent');
  if (nameLower.includes('dishwash') || nameLower.includes('dish'))     hints.push('bartan sabun vim');
  if (nameLower.includes('soap') || nameLower.includes('body wash'))    hints.push('sabun saboon shower shampoo hair');
  if (nameLower.includes('toothpaste') || nameLower.includes('tooth'))  hints.push('dant oral toothpast paste');
  if (nameLower.includes('diaper') || nameLower.includes('nappy'))      hints.push('nappy baby');
  if (nameLower.includes('agarbatti') || nameLower.includes('incense')) hints.push('agarbati agarbathi pooja');
  if (nameLower.includes('almond'))  hints.push('badam dry fruit');
  if (nameLower.includes('cashew'))  hints.push('kaju dry fruit');
  if (nameLower.includes('raisin'))  hints.push('kishmish dry fruit');
  if (nameLower.includes('cornflake') || nameLower.includes('corn flake')) hints.push('breakfast cereal');

  return hints.join(' ');
}

function buildDocs(products: Product[]): SearchDoc[] {
  return products.map((p) => {
    const cat = CATEGORIES.find((c) => c.id === p.categoryId);
    return {
      product: p,
      name: p.name,
      brand: p.brand,
      sku: p.sku ?? '',
      category: cat?.name ?? '',
      subcats: (cat?.subcategories ?? []).join(' '),
      keywords: deriveKeywords(p),
    };
  });
}

const FUSE_OPTIONS = {
  keys: [
    { name: 'sku',      weight: 0.35 },
    { name: 'name',     weight: 0.35 },
    { name: 'brand',    weight: 0.18 },
    { name: 'keywords', weight: 0.08 },
    { name: 'category', weight: 0.03 },
    { name: 'subcats',  weight: 0.01 },
  ],
  threshold: FUZZY_THRESHOLD,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
  findAllMatches: true,
};

// ─── Public types ─────────────────────────────────────────────────────────────

export type SearchResultKind = 'exact' | 'fuzzy' | 'fallback';

export interface SearchResult {
  products: Product[];
  kind: SearchResultKind;
  fallbackProducts: Product[];
}

export type SearchEngine = (raw: string) => SearchResult;

// ─── Engine factory ───────────────────────────────────────────────────────────

/**
 * Build a search engine from a product list.
 * Call this once (e.g. useMemo) and reuse for repeated searches.
 */
export function createSearchEngine(products: Product[]): SearchEngine {
  const docs = buildDocs(products);
  const fuse = new Fuse(docs, FUSE_OPTIONS);

  // Best sellers shown as fallback when nothing matches
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 6);
  const dwarikaSpecials = products.filter((p) => p.isDwarikaSpecial).slice(0, 6);
  // If no flags set (e.g. no products tagged yet), fall back to first 12
  const fallback =
    bestSellers.length + dwarikaSpecials.length > 0
      ? [...bestSellers, ...dwarikaSpecials]
      : products.slice(0, 12);

  return function search(raw: string): SearchResult {
    const q = normalizeQuery(raw);
    if (!q) return { products: [], kind: 'exact', fallbackProducts: [] };

    const fuseResults = fuse.search(q);

    const exact   = fuseResults.filter((r) => (r.score ?? 1) <= EXACT_THRESHOLD).map((r) => r.item.product);
    const allFuzz = fuseResults.map((r) => r.item.product);

    if (exact.length > 0)   return { products: exact,   kind: 'exact',    fallbackProducts: [] };
    if (allFuzz.length > 0) return { products: allFuzz, kind: 'fuzzy',    fallbackProducts: fallback };
    return                         { products: [],       kind: 'fallback', fallbackProducts: fallback };
  };
}

/**
 * One-shot search helper. Builds the engine every call — fine for infrequent use.
 * For repeated searches on the same product list, prefer createSearchEngine().
 */
export function searchProducts(raw: string, products: Product[]): SearchResult {
  return createSearchEngine(products)(raw);
}

/** Pre-built fallback list for the SearchPage discovery view. */
export function getFallbackProducts(products: Product[]): Product[] {
  const bs = products.filter((p) => p.isBestSeller).slice(0, 6);
  const ds = products.filter((p) => p.isDwarikaSpecial).slice(0, 6);
  return bs.length + ds.length > 0 ? [...bs, ...ds] : products.slice(0, 12);
}
