import { useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { Search, ChevronRight, Plus, Minus, Wheat, Milk, Droplets, Cookie, Flame, Coffee, Sparkles, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { CATEGORIES, PRODUCTS, BANNER_SLIDES, Product } from '../lib/mockData';

// ── Consistent flat vector icons for every category ──────────────────────────
const CATEGORY_ICONS: Record<string, { Icon: React.ElementType; bg: string; color: string }> = {
  '1': { Icon: Wheat,    bg: '#FEF3C7', color: '#D97706' }, // Atta & Rice
  '2': { Icon: Milk,     bg: '#E0F2FE', color: '#0284C7' }, // Dairy & Bread
  '3': { Icon: Droplets, bg: '#FEF9C3', color: '#B45309' }, // Oil & Ghee
  '4': { Icon: Cookie,   bg: '#FFEDD5', color: '#EA580C' }, // Biscuits & Snacks
  '5': { Icon: Flame,    bg: '#FEE2E2', color: '#DC2626' }, // Masale
  '6': { Icon: Coffee,   bg: '#D1FAE5', color: '#059669' }, // Beverages
  '7': { Icon: Sparkles, bg: '#DBEAFE', color: '#2563EB' }, // Home Care
  '8': { Icon: Heart,    bg: '#FCE7F3', color: '#DB2777' }, // Personal Care
};

export function ProductCard({ product }: { product: Product }) {
  const [, setLocation] = useLocation();
  const { cart, addToCart, updateQty } = useApp();
  
  const cartItem = cart.find(c => c.product.id === product.id);
  const qty = cartItem ? cartItem.qty : 0;

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
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative w-[160px] min-w-[160px] active:scale-[0.98] transition-transform cursor-pointer"
    >
      {!product.inStock && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
          <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full">Out of Stock</span>
        </div>
      )}
      
      <div 
        className="h-32 w-full flex items-center justify-center relative p-4"
        style={{ backgroundColor: `${product.color}20` }}
      >
        <div 
          className="w-20 h-20 rounded-full shadow-inner flex items-center justify-center text-center p-2 text-xs font-bold text-gray-800 bg-white/80 border-4 border-white"
          style={{ backgroundColor: product.color }}
        >
          {product.brand}
        </div>
      </div>
      
      <div className="p-3 flex-1 flex flex-col">
        {/* Brand — lighter, smaller, clear separation from product name */}
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide truncate mb-1.5">{product.brand}</p>
        <h3 className="font-semibold text-[13px] leading-tight text-gray-900 line-clamp-2 mb-1.5 min-h-[38px]">{product.name}</h3>
        <p className="text-[11px] text-gray-400 mb-2">{product.weight}</p>
        
        <div className="mt-auto flex items-center justify-between gap-1">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 line-through leading-none mb-0.5">₹{product.mrp}</p>
            <p className="font-bold text-[15px] text-primary leading-none">₹{product.price}</p>
          </div>
          
          {qty === 0 ? (
            <button 
              onClick={handleAdd}
              disabled={!product.inStock}
              className={`shrink-0 border border-primary text-primary px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide active:bg-primary/10 transition-colors ${!product.inStock ? 'opacity-50' : ''}`}
            >
              + ADD
            </button>
          ) : (
            <div className="flex items-center bg-primary text-white rounded-lg h-8 w-[72px]">
              <button 
                onClick={(e) => handleUpdate(e, qty - 1)}
                className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-l-lg"
              >
                <Minus size={14} />
              </button>
              <span className="text-sm font-bold w-4 text-center">{qty}</span>
              <button 
                onClick={(e) => handleUpdate(e, qty + 1)}
                className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-r-lg"
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

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    if (!emblaApi) return;
    const id = window.setInterval(() => emblaApi.scrollNext(), 3000);
    return () => window.clearInterval(id);
  }, [emblaApi]);

  const bestSellers = PRODUCTS.slice(0, 6);
  const dwarikaSpecials = PRODUCTS.slice(6, 12);

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

      <div className="px-4 py-5 overflow-hidden">
        <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex">
            {BANNER_SLIDES.map((slide) => (
              <div key={slide.id} className="flex-[0_0_100%] min-w-0">
                <div className={`${slide.bg} p-6 rounded-2xl h-36 flex flex-col justify-center relative overflow-hidden`}>
                  <div className="relative z-10">
                    <h2 className={`${slide.textColor} font-bold text-2xl mb-1`}>{slide.title}</h2>
                    <p className={`${slide.textColor} text-sm opacity-90 mb-3`}>{slide.subtitle}</p>
                    <button
                      className={
                        slide.btnStyle === 'gold'
                          ? 'bg-[#FFD700] text-[#063d28] text-xs font-bold px-4 py-1.5 rounded-full shadow-sm'
                          : 'bg-white text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm'
                      }
                    >
                      Shop Now
                    </button>
                  </div>
                  <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="flex justify-between items-end mb-4">
          <h2 className="font-bold text-lg text-gray-900">Explore Categories</h2>
        </div>
        
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {CATEGORIES.slice(0, 8).map((cat) => {
            const style = CATEGORY_ICONS[cat.id];
            if (!style) return null;
            const { Icon, bg, color } = style;
            return (
              <Link key={cat.id} href={`/category/${cat.id}`} className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
                <div
                  className="w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={28} color={color} strokeWidth={1.75} />
                </div>
                <span className="text-[10px] text-center font-medium leading-tight text-gray-700">{cat.name}</span>
              </Link>
            );
          })}
        </div>
        
        <button 
          onClick={() => setLocation('/categories')}
          className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 active:bg-gray-50"
        >
          View All Categories <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-6 py-4 bg-gradient-to-b from-green-50 to-transparent">
        <div className="px-4 flex justify-between items-end mb-4">
          <h2 className="font-bold text-lg text-gray-900">Best Sellers</h2>
          <Link href="/products/all" className="text-primary text-sm font-semibold">See All</Link>
        </div>
        <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x no-scrollbar">
          {bestSellers.map(product => (
            <div key={product.id} className="snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 py-4">
        <div className="px-4 flex justify-between items-end mb-4">
          <h2 className="font-bold text-lg text-gray-900">Dwarika Specials</h2>
          <Link href="/products/all" className="text-primary text-sm font-semibold">See All</Link>
        </div>
        <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x no-scrollbar">
          {dwarikaSpecials.map(product => (
            <div key={product.id} className="snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </motion.div>
  );
}
