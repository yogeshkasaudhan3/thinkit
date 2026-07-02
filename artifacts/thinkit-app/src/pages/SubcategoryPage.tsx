import { useState, useEffect, useMemo, useRef } from 'react';
import { useRoute } from 'wouter';
import { motion } from 'framer-motion';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ProductCard } from './HomePage';
import { useProducts } from '../lib/useProducts';

/** Fetches the category name from the public categories API. */
function useCategoryInfo(id: string | undefined) {
  const [category, setCategory] = useState<{ id: number; name: string; emoji: string } | null>(
    null,
  );

  useEffect(() => {
    // Clear immediately so we never show a stale title from a previous category
    setCategory(null);
    if (!id) return;
    let cancelled = false;
    fetch('/api/categories', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((cats: { id: number; name: string; emoji: string }[]) => {
        if (!cancelled) {
          const found = cats.find((c) => String(c.id) === id);
          setCategory(found ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  return category;
}

export default function SubcategoryPage() {
  const [, params] = useRoute('/category/:id');
  const categoryId = params?.id;

  const category = useCategoryInfo(categoryId);
  const [activeSubcat, setActiveSubcat] = useState<string | null>(null);
  const prevCategoryIdRef = useRef<string | undefined>(undefined);

  const { products: categoryProducts, loading } = useProducts(
    categoryId ? { categoryId } : undefined,
  );

  // Derive subcategory tabs from actual product data — sorted case-insensitively
  const subcategories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of categoryProducts) {
      if (p.subcategory && p.subcategory.trim()) seen.add(p.subcategory.trim());
    }
    return [...seen].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [categoryProducts]);

  // Keep activeSubcat in sync with the current category + loaded subcategories.
  // Order matters: reset on category change first, then auto-select from derived list.
  useEffect(() => {
    const categoryChanged = prevCategoryIdRef.current !== categoryId;
    prevCategoryIdRef.current = categoryId;

    if (categoryChanged) {
      // Hard reset — let the next effect pick the first subcategory
      setActiveSubcat(null);
      return;
    }

    // Auto-select first subcategory when the list becomes available,
    // or recover if the currently active one was removed from the list.
    if (subcategories.length > 0) {
      setActiveSubcat((prev) =>
        prev !== null && subcategories.includes(prev) ? prev : subcategories[0],
      );
    }
  }, [categoryId, subcategories]);

  // Filter products by the active tab (only when tabs exist)
  const displayProducts = useMemo(() => {
    if (subcategories.length === 0 || activeSubcat === null) return categoryProducts;
    return categoryProducts.filter(
      (p) => p.subcategory?.trim() === activeSubcat,
    );
  }, [categoryProducts, subcategories, activeSubcat]);

  const title = category?.name ?? '';

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20 flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title={title} showBack />

      {/* Subcategory Tabs — rendered only when products have subcategory data */}
      {!loading && subcategories.length > 0 && (
        <div className="bg-white border-b border-gray-100 sticky top-14 z-30 shadow-sm">
          <div className="flex overflow-x-auto no-scrollbar px-4 py-3 gap-2">
            {subcategories.map((subcat) => (
              <button
                key={subcat}
                onClick={() => setActiveSubcat(subcat)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
                  activeSubcat === subcat
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {subcat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <p className="text-sm">Loading products…</p>
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <p className="text-sm text-center px-4">
              {subcategories.length > 0
                ? 'No products available in this section.'
                : 'No products found in this category.'}
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </motion.div>
  );
}
