import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { motion } from 'framer-motion';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ProductCard } from './HomePage';
import { CATEGORIES } from '../lib/mockData';
import { useProducts } from '../lib/useProducts';

export default function SubcategoryPage() {
  const [, params] = useRoute('/category/:id');
  const categoryId = params?.id;

  const category = CATEGORIES.find(c => c.id === categoryId);

  const [activeSubcat, setActiveSubcat] = useState<string>('');

  useEffect(() => {
    if (category && category.subcategories.length > 0) {
      setActiveSubcat(category.subcategories[0]);
    }
  }, [category]);

  const { products: categoryProducts, loading } = useProducts(
    categoryId ? { categoryId } : undefined,
  );

  if (!category) return null;

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20 flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title={category.name} showBack />

      {/* Subcategory Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-30">
        <div className="flex overflow-x-auto no-scrollbar px-4 py-3 gap-2">
          {category.subcategories.map(subcat => (
            <button
              key={subcat}
              onClick={() => setActiveSubcat(subcat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeSubcat === subcat
                  ? 'bg-primary border-primary text-white'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {subcat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <p className="text-sm">Loading products…</p>
          </div>
        ) : categoryProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {categoryProducts.map(product => (
              <div key={product.id} className="w-full">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <p>No products found in this category.</p>
          </div>
        )}
      </div>

      <BottomNav />
    </motion.div>
  );
}
