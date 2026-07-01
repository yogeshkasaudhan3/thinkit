import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, X, Clock, TrendingUp } from 'lucide-react';
import { ProductCard } from './HomePage';
import BottomNav from '../components/BottomNav';
import { PRODUCTS, CATEGORIES } from '../lib/mockData';

// ─── Constants ─────────────────────────────────────────────────────────────────

const POPULAR_SEARCHES = [
  'Atta', 'Rice', 'Ghee', 'Amul Butter', 'Tea', 'Maggi', 'Dettol', 'Surf Excel',
  'Basmati Rice', 'Tata Salt',
];

const RECENT_KEY = 'thinkit_recent_searches';
const MAX_RECENT = 6;

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const prev = getRecent().filter(q => q.toLowerCase() !== query.toLowerCase());
  const next = [query, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function removeRecent(query: string) {
  const next = getRecent().filter(q => q !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getCategoryName(categoryId: string) {
  return CATEGORIES.find(c => c.id === categoryId)?.name ?? '';
}

function filterProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    getCategoryName(p.categoryId).toLowerCase().includes(q)
  );
}

// ─── Chip ──────────────────────────────────────────────────────────────────────

function Chip({
  label,
  icon,
  onTap,
  onRemove,
}: {
  label: string;
  icon: React.ReactNode;
  onTap: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm text-gray-700">
      {icon}
      <button className="flex-1 text-left leading-none" onClick={onTap}>
        {label}
      </button>
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(getRecent);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const results = filterProducts(query);
  const isSearching = query.trim().length > 0;

  const commitSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    setRecent(getRecent());
  }, []);

  const handleSelect = (q: string) => {
    setQuery(q);
    commitSearch(q);
    inputRef.current?.focus();
  };

  const handleRemoveRecent = (q: string) => {
    removeRecent(q);
    setRecent(getRecent());
  };

  const handleClearAll = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
  };

  // Save to recent on blur if query is non-empty
  const handleBlur = () => {
    if (query.trim()) commitSearch(query);
  };

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 flex flex-col"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Search bar header ── */}
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
            onBlur={handleBlur}
            placeholder='Search for "Atta", "Amul", …'
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 active:text-gray-600 shrink-0"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

          {/* ── Results ── */}
          {isSearching ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              {results.length > 0 ? (
                <>
                  <p className="text-xs text-gray-500 mb-3 font-medium">
                    {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query.trim()}&rdquo;
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {results.map(product => (
                      <div key={product.id} className="w-full">
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Search size={28} className="text-gray-300" />
                  </div>
                  <p className="font-bold text-gray-700 text-base mb-1">No products found</p>
                  <p className="text-sm text-gray-400">
                    We couldn&apos;t find anything for &ldquo;{query.trim()}&rdquo;.<br />Try a different name or brand.
                  </p>
                </div>
              )}
            </motion.div>

          ) : (

            /* ── Discovery state ── */
            <motion.div
              key="discovery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-6"
            >
              {/* Hint */}
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Search size={24} className="text-primary" />
                </div>
                <p className="text-sm text-gray-500 font-medium">Start typing to search products</p>
              </div>

              {/* Recent searches */}
              {recent.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      Recent Searches
                    </h3>
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-primary font-semibold active:opacity-70"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map(q => (
                      <Chip
                        key={q}
                        label={q}
                        icon={<Clock size={12} className="text-gray-400 shrink-0" />}
                        onTap={() => handleSelect(q)}
                        onRemove={() => handleRemoveRecent(q)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Popular searches */}
              <section>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
                  <TrendingUp size={14} className="text-primary" />
                  Popular Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map(q => (
                    <Chip
                      key={q}
                      label={q}
                      icon={<TrendingUp size={12} className="text-primary shrink-0" />}
                      onTap={() => handleSelect(q)}
                    />
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </motion.div>
  );
}
