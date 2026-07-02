import { useEffect, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { Search, ChevronRight, Plus, Minus, Wheat, Milk, Droplets, Cookie, Flame, Coffee, Sparkles, Heart, Grid, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { CATEGORY_COLORS, type Product } from '../lib/mockData';
import { useProducts } from '../lib/useProducts';
import { useBanners } from '../lib/useBanners';
import { useCategories } from '../lib/useCategories';

// ── Fallback icons for categories (used when no image/emoji is set) ───────────
const CATEGORY_ICONS: Record<string, { Icon: React.ElementType; bg: string; color: string }> = {
  '1': { Icon: Wheat,    bg: '#FEF3C7', color: '#D97706' },
  '2': { Icon: Milk,     bg: '#E0F2FE', color: '#0284C7' },
  '3': { Icon: Droplets, bg: '#FEF9C3', color: '#B45309' },
  '4': { Icon: Cookie,   bg: '#FFEDD5', color: '#EA580C' },
  '5': { Icon: Flame,    bg: '#FEE2E2', color: '#DC2626' },
  '6': { Icon: Coffee,   bg: '#D1FAE5', color: '#059669' },
  '7': { Icon: Sparkles, bg: '#DBEAFE', color: '#2563EB' },
  '8': { Icon: Heart,    bg: '#FCE7F3', color: '#DB2777' },
};

export function ProductCard({ product }: { product: Product }) {
  const [, setLocation] = useLocation();
  const { cart, addToCart, updateQty } = useApp();

  const cartItem = cart.find(c => c.product.id === product.id);
  const qty = cartItem ? cartItem.qty : 0;

  const effectiveColor = product.color || CATEGORY_COLORS[product.categoryId] || '#e8e8e8';

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  };

  const handleUpdate = (e: React.MouseEvent, newQty: number) => {
    e.stopPropagation();
    updateQty(product.id, newQty);
  };

  return (
    <div
      onClick={() => setLocation(`/product/${product.id}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden flex flex-col relative w-full active:scale-[0.98] transition-transform cursor-pointer"
    >
      {!product.inStock && (
        <div className="absolute inset-0 bg-white/75 z-10 flex items-center justify-center">
          <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full">Out of Stock</span>
        </div>
      )}

      {/* Image area — 55–60% of card height */}
      <div
        className="h-[150px] w-full flex items-center justify-center relative p-3"
        style={{ backgroundColor: `${effectiveColor}18` }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-center p-3 text-sm font-bold text-gray-700 rounded-xl"
            style={{ backgroundColor: `${effectiveColor}30` }}
          >
            {product.brand}
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="px-3 pt-2 pb-3 flex-1 flex flex-col gap-0.5">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest truncate">{product.brand}</p>
        <h3 className="font-bold text-[13px] leading-tight text-gray-900 line-clamp-2 min-h-[36px]">{product.name}</h3>
        <p className="text-[11px] text-gray-400">{product.weight}</p>

        <div className="mt-2 flex items-end justify-between gap-1">
          <div className="min-w-0">
            {product.mrp > product.price && (
              <p className="text-[10px] text-gray-400 line-through leading-none mb-0.5">₹{product.mrp}</p>
            )}
            <p className="font-bold text-[16px] text-primary leading-none">₹{product.price}</p>
          </div>

          {qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={!product.inStock}
              className={`shrink-0 border-2 border-primary text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wide active:bg-primary/10 transition-colors ${!product.inStock ? 'opacity-50' : ''}`}
            >
              + ADD
            </button>
          ) : (
            <div className="flex items-center bg-primary text-white rounded-full h-8 w-[76px]">
              <button
                onClick={(e) => handleUpdate(e, qty - 1)}
                className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-l-full"
              >
                <Minus size={14} />
              </button>
              <span className="text-sm font-bold w-5 text-center">{qty}</span>
              <button
                onClick={(e) => handleUpdate(e, qty + 1)}
                className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-r-full"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category icon tile ────────────────────────────────────────────────────────

function CategoryTile({ cat }: { cat: { id: number; name: string; emoji: string | null; imageUrl: string | null } }) {
  const style = CATEGORY_ICONS[String(cat.id)];

  return (
    <Link
      href={`/category/${cat.id}`}
      className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
    >
      <div
        className="w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: style ? style.bg : '#F3F4F6' }}
      >
        {cat.imageUrl ? (
          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
        ) : cat.emoji ? (
          <span className="text-3xl">{cat.emoji}</span>
        ) : style ? (
          <style.Icon size={28} color={style.color} strokeWidth={1.75} />
        ) : (
          <ShoppingBag size={24} color="#6B7280" strokeWidth={1.75} />
        )}
      </div>
      <span className="text-[10px] text-center font-medium leading-tight text-gray-700">{cat.name}</span>
    </Link>
  );
}

// ── Fallback banner slides (shown while DB banners load or if none exist) ─────
const FALLBACK_BANNERS = [
  {
    id: 0,
    title: '🎉 Thinkit Grand Launch',
    subtitle: 'Free Delivery Above ₹299',
    bg: 'bg-gradient-to-br from-[#063d28] via-[#0B5D3B] to-[#1a5c36]',
    buttonText: 'Shop Now',
    imageUrl: null,
  },
];

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const { allProducts } = useProducts();
  const { banners, loading: bannersLoading } = useBanners();
  const { categories, loading: categoriesLoading } = useCategories();

  useEffect(() => {
    if (!emblaApi) return;
    const id = window.setInterval(() => emblaApi.scrollNext(), 3000);
    return () => window.clearInterval(id);
  }, [emblaApi]);

  const bestSellers = useMemo(() => {
    const flagged = allProducts.filter(p => p.isBestSeller);
    return (flagged.length > 0 ? flagged : allProducts).slice(0, 6);
  }, [allProducts]);

  const dwarikaSpecials = useMemo(() => {
    const flagged = allProducts.filter(p => p.isDwarikaSpecial);
    if (flagged.length > 0) return flagged.slice(0, 6);
    return allProducts.slice(6, 12);
  }, [allProducts]);

  // Use live banners from DB; fall back to a default while loading or if empty
  const displayBanners = !bannersLoading && banners.length > 0 ? banners : FALLBACK_BANNERS;

  // Show top 8 active categories
  const displayCategories = categories.slice(0, 8);

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader showAddress showNotification />

      <div className="p-4 bg-primary sticky top-[60px] z-40 -mt-1 rounded-b-3xl shadow-sm">
        <div
          className="bg-white rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-inner cursor-text"
          onClick={() => setLocation('/search')}
        >
          <Search size={20} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Search atta, oil, biscuits...</span>
        </div>
      </div>

      {/* ── Banner carousel ── */}
      <div className="px-4 py-5 overflow-hidden">
        <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex">
            {displayBanners.map((slide) => (
              <div key={slide.id} className="flex-[0_0_100%] min-w-0">
                {slide.imageUrl ? (
                  /* Image banner */
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-gray-100">
                    <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex flex-col justify-center p-6">
                      <h2 className="text-white font-bold text-2xl mb-1">{slide.title}</h2>
                      {slide.subtitle && <p className="text-white text-sm opacity-90 mb-3">{slide.subtitle}</p>}
                      <button className="bg-white text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm self-start">
                        {slide.buttonText || 'Shop Now'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Gradient banner */
                  <div className={`${slide.bg || 'bg-gradient-to-r from-primary to-primary/80'} p-6 rounded-2xl h-36 flex flex-col justify-center relative overflow-hidden`}>
                    <div className="relative z-10">
                      <h2 className="text-white font-bold text-2xl mb-1">{slide.title}</h2>
                      {slide.subtitle && <p className="text-white text-sm opacity-90 mb-3">{slide.subtitle}</p>}
                      <button className="bg-white text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                        {slide.buttonText || 'Shop Now'}
                      </button>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category grid ── */}
      <div className="px-4 py-2">
        <div className="flex justify-between items-end mb-4">
          <h2 className="font-bold text-lg text-gray-900">Explore Categories</h2>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-4 gap-y-6 gap-x-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 animate-pulse" />
                <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-y-6 gap-x-2">
            {displayCategories.map((cat) => (
              <CategoryTile key={cat.id} cat={cat} />
            ))}
          </div>
        )}

        <button
          onClick={() => setLocation('/categories')}
          className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 active:bg-gray-50"
        >
          View All Categories <ChevronRight size={16} />
        </button>
      </div>

      {bestSellers.length > 0 && (
        <div className="mt-6 py-4 bg-gradient-to-b from-green-50 to-transparent">
          <div className="px-4 flex justify-between items-end mb-4">
            <h2 className="font-bold text-lg text-gray-900">Best Sellers</h2>
            <Link href="/products/all" className="text-primary text-sm font-semibold">See All</Link>
          </div>
          <div className="flex overflow-x-auto gap-3 px-4 pb-4 snap-x no-scrollbar">
            {bestSellers.map(product => (
              <div key={product.id} className="snap-start min-w-[160px] w-[160px]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}

      {dwarikaSpecials.length > 0 && (
        <div className="mt-2 py-4">
          <div className="px-4 flex justify-between items-end mb-4">
            <h2 className="font-bold text-lg text-gray-900">Dwarika Specials</h2>
            <Link href="/products/all" className="text-primary text-sm font-semibold">See All</Link>
          </div>
          <div className="flex overflow-x-auto gap-3 px-4 pb-4 snap-x no-scrollbar">
            {dwarikaSpecials.map(product => (
              <div key={product.id} className="snap-start min-w-[160px] w-[160px]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </motion.div>
  );
}
