/**
 * Generic product listing page (/products/:categoryId).
 * Uses paginated server-side fetching via useCategoryProducts.
 */
import { useState, useEffect, useRef } from 'react';
import { useRoute } from 'wouter';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ProductCard } from './HomePage';
import { CATEGORIES, type Product } from '../lib/mockData';
import { useCategoryProducts } from '../lib/useCategoryProducts';

export default function ProductListingPage() {
  const [, params] = useRoute('/products/:categoryId');
  const categoryId = params?.categoryId;

  const [filter, setFilter] = useState('All');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const effectiveCategoryId = categoryId === 'all' ? undefined : categoryId;
  const { products: allLoaded, loading, loadingMore, hasMore, total, loadMore } =
    useCategoryProducts(effectiveCategoryId);

  // Client-side price/stock filter on already-loaded pages
  let products: Product[] = allLoaded;
  if (filter === 'Under ₹100') products = allLoaded.filter(p => p.price < 100);
  if (filter === 'Under ₹50')  products = allLoaded.filter(p => p.price < 50);
  if (filter === 'In Stock')   products = allLoaded.filter(p => p.inStock);

  const title = categoryId === 'all'
    ? 'All Products'
    : CATEGORIES.find(c => c.id === categoryId)?.name || 'Products';

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20 flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader
        title={title}
        showBack
        rightAction={<button className="p-2"><SlidersHorizontal size={20} className="text-gray-600"/></button>}
      />

      <div className="bg-white border-b border-gray-100 sticky top-14 z-30">
        <div className="flex overflow-x-auto no-scrollbar px-4 py-3 gap-2">
          {['All', 'Under ₹50', 'Under ₹100', 'In Stock'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                filter === f
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <p className="text-xs text-gray-400 mb-3">Loading products…</p>
        ) : (
          <p className="text-xs text-gray-500 mb-3">{total} products</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
          {loadingMore && (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={`sk-${i}`} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-[150px] bg-gray-100" />
                <div className="p-2.5 flex flex-col gap-2">
                  <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-7 bg-gray-100 rounded-lg mt-1" />
                </div>
              </div>
            ))
          )}
        </div>
        <div ref={sentinelRef} style={{ height: 1 }} />
        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <p className="text-sm">No products found.</p>
          </div>
        )}
      </div>

      <BottomNav />
    </motion.div>
  );
}
