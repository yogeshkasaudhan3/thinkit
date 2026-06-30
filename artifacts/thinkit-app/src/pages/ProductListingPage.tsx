import { useState } from 'react';
import { useRoute } from 'wouter';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ProductCard } from './HomePage';
import { PRODUCTS, CATEGORIES } from '../lib/mockData';

export default function ProductListingPage() {
  const [match, params] = useRoute('/products/:categoryId');
  const categoryId = params?.categoryId;
  
  const [filter, setFilter] = useState('All');
  
  let products = categoryId === 'all' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.categoryId === categoryId);
    
  if (filter === 'Under ₹100') products = products.filter(p => p.price < 100);
  if (filter === 'Under ₹50') products = products.filter(p => p.price < 50);
  if (filter === 'In Stock') products = products.filter(p => p.inStock);

  const title = categoryId === 'all' 
    ? 'All Products' 
    : CATEGORIES.find(c => c.id === categoryId)?.name || 'Products';

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
        <p className="text-xs text-gray-500 mb-3">{products.length} products</p>
        <div className="grid grid-cols-2 gap-3">
          {products.map(product => (
            <div key={product.id} className="w-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </motion.div>
  );
}
