/**
 * Thinkit Fuzzy Search Engine
 *
 * Pipeline:
 *   1. Normalize query (alias map: aata→atta, ashirwad→aashirvaad, …)
 *   2. Run Fuse.js on enriched documents (name + brand + category + subcats + keywords)
 *   3. Split results into "good" (score ≤ EXACT_THRESHOLD) and "fuzzy" (score ≤ FUZZY_THRESHOLD)
 *   4. If zero results → return best-seller fallback with isFallback flag
 *
 * The Fuse index is built once at module-load time so repeated searches are fast.
 */

import Fuse from 'fuse.js';
import { PRODUCTS, CATEGORIES, type Product } from './mockData';

// ─── Thresholds ────────────────────────────────────────────────────────────────
// Fuse score: 0 = perfect match, 1 = no match at all
const EXACT_THRESHOLD = 0.35;   // tight – shown as "N results for …"
const FUZZY_THRESHOLD = 0.55;   // loose – shown as "similar products" fallback

// ─── Alias / normalization map ─────────────────────────────────────────────────
// Maps common Indian misspellings / alternate spellings → canonical search term.
// Checked BEFORE fuzzy so even very wrong spellings land on the right products.
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
  category: string;
  subcats: string;
  keywords: string;
}

// Per-product hand-tuned keyword hints for common alternate names.
// RULE: every alias in ALIASES must resolve to a term that appears here
// or in name/brand/category/subcats — otherwise users get only the fallback.
const PRODUCT_KEYWORDS: Record<string, string> = {
  p1:  'gehu atta wheat flour aashirvaad',
  p2:  'chawal basmati rice fortune',
  p3:  'makhan makkhan butter amul dairy',
  p4:  'bread double roti whole wheat',
  p5:  'tel sunflower oil refined',
  p6:  'desi ghee pure amul',
  p7:  'glucose parle g biscuit biskut',
  p8:  'bhujia aloo namkeen haldirams snack',
  p9:  'garam masala mdh spice mirch',
  p10: 'haldi turmeric powder tata',
  // sampoo/shampoo → hair care; chai/tea; cold drink → beverage
  p11: 'chai chaye tea tata premium beverage drink',
  p12: 'cofee coffee nescafe classic cold drink coldrink beverage',
  p13: 'washing powder detergent surf excel kapda',
  p14: 'bartan dishwash vim bar sabun',
  // sampoo/shampoo → closest personal-care product; sabun/soap
  p15: 'soap sabun dove bathing bar shower shampoo hair wash body',
  p16: 'toothpaste colgate teeth paste dant oral',
  p17: 'nappy diaper pampers baby',
  p18: 'agarbati incense sandal mangaldeep pooja',
  p19: 'badam almond dry fruit happilo',
  p20: 'cornflakes corn flakes breakfast kelloggs',
  p21: 'magi noodles two minute masala',
  p22: 'doodh milk amul taaza toned',
};

function buildDocs(): SearchDoc[] {
  return PRODUCTS.map(p => {
    const cat = CATEGORIES.find(c => c.id === p.categoryId);
    return {
      product: p,
      name: p.name,
      brand: p.brand,
      category: cat?.name ?? '',
      subcats: (cat?.subcategories ?? []).join(' '),
      keywords: PRODUCT_KEYWORDS[p.id] ?? '',
    };
  });
}

// ─── Fuse index (built once) ──────────────────────────────────────────────────

const DOCS = buildDocs();

const fuse = new Fuse(DOCS, {
  keys: [
    { name: 'name',     weight: 0.45 },
    { name: 'brand',    weight: 0.30 },
    { name: 'keywords', weight: 0.15 },
    { name: 'category', weight: 0.07 },
    { name: 'subcats',  weight: 0.03 },
  ],
  threshold: FUZZY_THRESHOLD,   // pre-filter: Fuse won't return anything worse
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,         // don't penalize matches at end of string
  findAllMatches: true,
});

// ─── Public API ───────────────────────────────────────────────────────────────

export type SearchResultKind =
  | 'exact'     // good score matches
  | 'fuzzy'     // some fuzzy matches but none great
  | 'fallback'; // nothing matched at all

export interface SearchResult {
  products: Product[];
  kind: SearchResultKind;
  fallbackProducts: Product[]; // best-sellers + dwarika specials shown alongside "no exact match"
}

/** Best sellers = first 6 products; Dwarika Specials = next 6 */
const BEST_SELLERS = PRODUCTS.slice(0, 6);
const DWARIKA_SPECIALS = PRODUCTS.slice(6, 12);
export const FALLBACK_PRODUCTS = [...BEST_SELLERS, ...DWARIKA_SPECIALS];

export function searchProducts(raw: string): SearchResult {
  const q = normalizeQuery(raw);
  if (!q) return { products: [], kind: 'exact', fallbackProducts: [] };

  const fuseResults = fuse.search(q);

  const exact   = fuseResults.filter(r => (r.score ?? 1) <= EXACT_THRESHOLD).map(r => r.item.product);
  const allFuzz = fuseResults.map(r => r.item.product);

  if (exact.length > 0) {
    return { products: exact, kind: 'exact', fallbackProducts: [] };
  }

  if (allFuzz.length > 0) {
    return { products: allFuzz, kind: 'fuzzy', fallbackProducts: FALLBACK_PRODUCTS };
  }

  return { products: [], kind: 'fallback', fallbackProducts: FALLBACK_PRODUCTS };
}
