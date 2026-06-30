import { Link } from 'wouter';
import { motion } from 'framer-motion';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { CATEGORIES } from '../lib/mockData';
import { ChevronRight } from 'lucide-react';

export default function CategoriesPage() {
  return (
    <motion.div 
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title="All Categories" showBack />
      
      <div className="p-4 grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <Link 
            key={cat.id} 
            href={`/category/${cat.id}`}
            className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 shadow-sm active:scale-95 transition-transform"
          >
            <div className="flex justify-between items-start">
              <div className="text-4xl bg-gray-50 w-14 h-14 rounded-xl flex items-center justify-center">
                {cat.emoji}
              </div>
              <ChevronRight size={16} className="text-gray-300 mt-1" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{cat.productCount} items</p>
            </div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </motion.div>
  );
}
