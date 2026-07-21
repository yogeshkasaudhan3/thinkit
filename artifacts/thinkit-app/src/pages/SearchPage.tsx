/**
 * Search page — server-side search with 300 ms debounce.
 *
 * No full product preload. Query is sent to GET /api/products?search=<term>&limit=50
 * after the user stops typing for 300 ms. Hindi/brand aliases are normalised
 * client-side before the query is sent so typos still find the right products.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, X, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { ProductCard } from './HomePage';
import BottomNav from '../components/BottomNav';
import type { Product } from '../lib/mockData';

// ─── Constants ─────────────────────────────────────────────────────────────────

const POPULAR_SEARCHES = [
  'Atta', 'Rice', 'Ghee', 'Amul Butter', 'Tea', 'Maggi',
  'Dettol', 'Surf Excel', 'Basmati Rice', 'Tata Salt',
];

const RECENT_KEY = 'thinkit_recent_searches';
const MAX_RECENT = 6;
const DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 50;

// ─── Alias normalisation ───────────────────────────────────────────────────────
// Normalise common Hindi/brand misspellings before sending to the server.
const ALIASES: Record<string, string> = {
  aata: 'atta', aatta: 'atta', wheat: 'atta', gehu: 'atta', gehun: 'atta',
  chawal: 'rice', chaawal: 'rice', basmati: 'rice',
  tel: 'oil', tael: 'oil', sarson: 'mustard', sarso: 'mustard',
  doodh: 'milk', dudh: 'milk', makkhan: 'butter', makhan: 'butter',
  panir: 'paneer', dahi: 'curd',
  haldi: 'turmeric', mirch: 'chilli', jeera: 'cumin',
  dhania: 'coriander', garam: 'garam masala',
  ashirwad: 'aashirvaad', ashirvaad: 'aashirvaad', aashirvad: 'aashirvaad',
  magi: 'maggi', magee: 'maggi', maagi: 'maggi', noodles: 'maggi',
  coldrink: 'cold drinks', pepsi: 'cold drinks', cola: 'cold drinks',
  chai: 'tea', chaye: 'tea', cofee: 'coffee', coffe: 'coffee',
  sampoo: 'shampoo', sampu: 'shampoo', shampo: 'shampoo',
  sabun: 'soap', saboon: 'soap',
  toothpast: 'toothpaste', tothpaste: 'toothpaste', paste: 'toothpaste',
  detarjent: 'detergent', deterjent: 'detergent', washin: 'detergent',
  biskut: 'biscuits', biskit: 'biscuits', namkeen: 'snacks',
  agarbati: 'agarbatti', agarbathi: 'agarbatti',
  badam: 'almonds', kaju: 'cashews', kishmish: 'raisins',
  diaper: 'diapers', nappy: 'diapers',
};

function normalizeQuery(raw: string): string {
  const q = raw.trim().toLowerCase();
  return ALIASES[q] ?? q;
}

// ─── Server search fetch ───────────────────────────────────────────────────────

interface PagedResponse {
  items: Product[];
  total: number;
  hasMore: boolean;
}

async function serverSearch(raw: string, signal: AbortSignal): Promise<Product[]> {
  const term = normalizeQuery(raw);
  const params = new URLSearchParams({ search: term, limit: String(SEARCH_LIMIT) });
  const r = await fetch(`/api/products?${params}`, { credentials: 'include', signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data: PagedResponse = await r.json();
  return data.items;
}

// ─── Recent search helpers ─────────────────────────────────────────────────────

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function saveRecent(query: string) {
  const prev = getRecent().filter(q => q.toLowerCase() !== query.toLowerCase());
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECENT)));
}

function removeRecent(query: string) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter(q => q !== query)));
}

// ─── Skeleton grid ─────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="p-4 grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="w-full bg-gray-100" style={{ aspectRatio: '1 / 1' }} />
          <div className="p-2.5 flex flex-col gap-2">
            <div className="h-2.5 bg-gray-100 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-4/5" />
            <div className="h-7 bg-gray-100 rounded-lg mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Chip ──────────────────────────────────────────────────────────────────────

function Chip({ label, icon, onTap, onRemove }: {
  label: string; icon: React.ReactNode; onTap: () => void; onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-700">
      {icon}
      <button className="flex-1 text-left leading-none" onClick={onTap}>{label}</button>
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 text-gray-400 active:text-gray-600"
          aria-label={`Remove ${label}`}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Product grid ─────────────────────────────────────────────────────────────

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map(p => (
        <div key={p.id} className="w-full">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

// ─── Results view ─────────────────────────────────────────────────────────────

function ResultsView({ query, results }: { query: string; results: Product[] }) {
  if (results.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-3 mb-4">
          <Sparkles size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 leading-snug">
            No results for &ldquo;<span className="font-semibold">{query.trim()}</span>&rdquo;.
            Try a different spelling or search for a brand name.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4">
      <p className="text-xs text-gray-500 mb-3 font-medium">
        {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query.trim()}&rdquo;
      </p>
      <ProductGrid products={results} />
    </div>
  );
}

// ─── Discovery state ─────────────────────────────────────────────────────────

function DiscoveryView({ recent, onSelect, onRemoveRecent, onClearAll }: {
  recent: string[];
  onSelect: (q: string) => void;
  onRemoveRecent: (q: string) => void;
  onClearAll: () => void;
}) {
  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Search size={24} className="text-primary" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Start typing to search products</p>
      </div>

      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Clock size={14} className="text-gray-400" /> Recent Searches
            </h3>
            <button onClick={onClearAll} className="text-xs text-primary font-semibold active:opacity-70">
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map(q => (
              <Chip
                key={q}
                label={q}
                icon={<Clock size={12} className="text-gray-400 shrink-0" />}
                onTap={() => onSelect(q)}
                onRemove={() => onRemoveRecent(q)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
          <TrendingUp size={14} className="text-primary" /> Popular Searches
        </h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map(q => (
            <Chip
              key={q}
              label={q}
              icon={<TrendingUp size={12} className="text-primary shrink-0" />}
              onTap={() => onSelect(q)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(getRecent);
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false); // debounce in-flight
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(0);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Debounced server search
  useEffect(() => {
    const term = query.trim();

    // Clear previous timer + in-flight request
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    if (!term) {
      setSearching(false);
      setResults([]);
      return;
    }

    setSearching(true);

    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      // Version gate: only the most recent request may update state
      const thisVersion = ++versionRef.current;
      try {
        const items = await serverSearch(term, ctrl.signal);
        if (versionRef.current === thisVersion) {
          setResults(items);
          setSearching(false);
        }
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError' && versionRef.current === thisVersion) {
          setResults([]);
          setSearching(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const commitSearch = useCallback((q: string) => {
    const t = q.trim();
    if (!t) return;
    saveRecent(t);
    setRecent(getRecent());
  }, []);

  const handleSelect = (q: string) => {
    setQuery(q);
    commitSearch(q);
    inputRef.current?.focus();
  };

  const isSearching = query.trim().length > 0;

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-gray-50 flex flex-col"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.2 }}
    >
      {/* Search bar header */}
      <div className="bg-primary px-3 pt-3 pb-3 flex items-center gap-2 sticky top-0 z-40 shadow-sm">
        <button
          onClick={() => setLocation('/home')}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white active:bg-white/10 transition-colors shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 bg-white rounded-xl flex items-center px-3 py-2.5 gap-2 shadow-inner">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onBlur={() => { if (query.trim()) commitSearch(query); }}
            placeholder='Search for "Atta", "Amul", …'
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query.length > 0 && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="text-gray-400 active:text-gray-600 shrink-0"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {searching ? <SkeletonGrid /> : <ResultsView query={query} results={results} />}
            </motion.div>
          ) : (
            <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DiscoveryView
                recent={recent}
                onSelect={handleSelect}
                onRemoveRecent={(q) => { removeRecent(q); setRecent(getRecent()); }}
                onClearAll={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </motion.div>
  );
}
