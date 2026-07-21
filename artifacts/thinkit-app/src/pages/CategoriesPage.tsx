import { Link } from 'wouter';
import { motion } from 'framer-motion';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { useCategories } from '../lib/useCategories';
import { cloudinaryOpt } from '../lib/imgUtils';

// ── Fallback icon colours for categories that don't have an image ────────────
const CAT_COLORS: Record<string, string> = {
  '1':  '#FEF3C7', '2':  '#E0F2FE', '3':  '#FEF9C3', '4':  '#FFEDD5',
  '5':  '#FEE2E2', '6':  '#D1FAE5', '7':  '#DBEAFE', '8':  '#FCE7F3',
  '9':  '#E0F2FE', '10': '#FEF9C3', '11': '#FFEDD5', '12': '#FEF3C7',
};

export default function CategoriesPage() {
  const { categories, loading } = useCategories();

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-gray-50 pb-20"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title="All Categories" showBack />

      {loading ? (
        <div className="p-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            /* aspect-[5/3] keeps skeleton proportional on any card width */
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse" style={{ aspectRatio: '5/3' }} />
          ))}
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 gap-3">
          {categories.map((cat) => {
            const bg = CAT_COLORS[String(cat.id)] ?? '#F3F4F6';
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.id}`}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 shadow-sm active:scale-95 transition-transform"
              >
                <div className="flex justify-between items-start">
                  {/* Icon — scales from 48 px (360 dp) to 60 px (480 dp) */}
                  <div
                    className="rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: bg, width: 'clamp(44px, 13.5vw, 60px)', height: 'clamp(44px, 13.5vw, 60px)' }}
                  >
                    {cat.imageUrl ? (
                      <img
                        src={cloudinaryOpt(cat.imageUrl, 112) ?? cat.imageUrl}
                        alt={cat.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : cat.emoji ? (
                      <span className="text-3xl">{cat.emoji}</span>
                    ) : (
                      <ShoppingBag size={24} color="#9CA3AF" strokeWidth={1.75} />
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 mt-1" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <BottomNav />
    </motion.div>
  );
}
