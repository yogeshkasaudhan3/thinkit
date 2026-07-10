/**
 * Home page.
 *
 * Best Sellers and Dwarika Specials are fetched with targeted server requests
 * (?isBestSeller=true&limit=12) instead of loading the full product catalogue.
 * ProductCard is memoized to prevent re-renders when only cart qty changes for
 * other products.
 */
import { useEffect, useState, useCallback, memo, useLayoutEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { Search, ChevronRight, Plus, Minus, Wheat, Milk, Droplets, Cookie, Flame, Coffee, Sparkles, Heart, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { CATEGORY_COLORS, type Product } from '../lib/mockData';
import { useBanners } from '../lib/useBanners';
import { useCategories } from '../lib/useCategories';
import { cloudinaryOpt } from '../lib/imgUtils';

// ── Fallback icons for categories ─────────────────────────────────────────────
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

// ── Targeted product fetcher (best-sellers / specials) ────────────────────────
interface PagedResponse { items: Product[]; total: number; hasMore: boolean; }

function useHomeSection(flag: 'isBestSeller' | 'isDwarikaSpecial'): Product[] {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products?${flag}=true&limit=12`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() as Promise<PagedResponse> : Promise.reject()))
      .then(({ items }) => { if (!cancelled) setProducts(items); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [flag]);

  return products;
}

// ── ProductCard (memoized) ────────────────────────────────────────────────────
// Exported so SubcategoryPage, SearchPage, and ProductDetailPage can reuse it.

export const ProductCard = memo(function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const [, setLocation] = useLocation();
  const { cart, addToCart, updateQty } = useApp();
  const [lqipLoaded, setLqipLoaded] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fullImgRef = useRef<HTMLImageElement>(null);
  const lqipImgRef = useRef<HTMLImageElement>(null);

  const cartItem = cart.find(c => c.product.id === product.id);
  const qty = cartItem ? cartItem.qty : 0;

  // 360px: at 390px viewport, 2-col grid with padding gives ~173px card slots.
  // 173 × 2 DPR = 346px → round up to 360 for a crisp 2× render.
  const fullSrc = cloudinaryOpt(product.imageUrl, 360);
  // 20px LQIP loads in <100 ms; shown blurred until full image is ready
  const lqipSrc = cloudinaryOpt(product.imageUrl, 20);

  // Reset + cache-hit check in a single useLayoutEffect so all setState calls
  // are batched into one commit before paint.
  //
  // Why useLayoutEffect instead of useEffect:
  //   - Runs synchronously after DOM mutation, before the browser paints.
  //   - setState here causes a synchronous re-render in the same commit, so
  //     the user never sees the intermediate "loading" state.
  //
  // Why img.complete:
  //   - When an image is in the browser's memory cache, the browser marks
  //     img.complete = true and naturalWidth > 0 synchronously as soon as the
  //     <img> element is added to the DOM (before onLoad can even fire).
  //   - Checking this here lets us skip the skeleton + fade-in entirely for
  //     cached images, making re-navigation feel instant.
  useLayoutEffect(() => {
    // Reset first (stale src → fresh loading state)
    setLqipLoaded(false);
    setFullLoaded(false);
    setImgError(false);

    // Immediately promote to loaded if the browser already has it in cache
    if (fullImgRef.current?.complete && fullImgRef.current.naturalWidth > 0) {
      setFullLoaded(true);
      setLqipLoaded(true);
      return;
    }
    if (lqipImgRef.current?.complete && lqipImgRef.current.naturalWidth > 0) {
      setLqipLoaded(true);
    }
  }, [fullSrc]);

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  }, [addToCart, product]);

  const handleUpdate = useCallback((e: React.MouseEvent, newQty: number) => {
    e.stopPropagation();
    updateQty(product.id, newQty);
  }, [updateQty, product.id]);

  return (
    <div
      onClick={() => setLocation(`/product/${product.id}`)}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative w-full active:scale-[0.98] transition-transform cursor-pointer"
    >
      {!product.inStock && (
        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-xl">
          <span className="bg-gray-800 text-white text-[11px] font-bold px-3 py-1 rounded-full">Out of Stock</span>
        </div>
      )}

      {/* Image area — fixed 150px height */}
      <div className="relative w-full bg-white border-b border-gray-100 overflow-hidden rounded-t-xl" style={{ height: 150 }}>
        {fullSrc && !imgError ? (
          <>
            {/* Gray pulse — visible only until the LQIP arrives */}
            {!lqipLoaded && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse" />
            )}

            {/* LQIP — 20 px thumbnail shown blurred while full image loads.
                Skipped for priority cards: their full image is already eager-loaded. */}
            {lqipSrc && !priority && (
              <img
                ref={lqipImgRef}
                src={lqipSrc}
                alt=""
                aria-hidden="true"
                draggable={false}
                onLoad={() => setLqipLoaded(true)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  padding: 12,
                  filter: 'blur(10px)',
                  transform: 'scale(1.08)', // hide blur edge artefacts
                  opacity: lqipLoaded && !fullLoaded ? 1 : 0,
                  transition: 'opacity 0.15s ease',
                }}
              />
            )}

            {/* Full image — eager + high priority for the first visible row */}
            <img
              ref={fullImgRef}
              src={fullSrc}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore — fetchPriority is valid HTML but may be missing from older @types/react
              fetchPriority={priority ? 'high' : 'auto'}
              decoding={priority ? 'sync' : 'async'}
              draggable={false}
              onLoad={() => { setFullLoaded(true); setLqipLoaded(true); }}
              onError={() => { setImgError(true); setLqipLoaded(true); setFullLoaded(true); }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: 12,
                opacity: fullLoaded ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 text-center text-[11px] font-semibold text-gray-400">
            {product.brand || product.name}
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="px-2.5 pt-2 pb-2.5 flex-1 flex flex-col gap-0.5">
        <p className="text-[10px] text-gray-400 font-medium truncate">{product.weight}</p>
        <h3 className="font-semibold text-[12.5px] leading-tight text-gray-900 line-clamp-2 min-h-[34px]">{product.name}</h3>

        <div className="mt-auto pt-1.5 flex items-center justify-between gap-1">
          <div className="min-w-0">
            {product.mrp > product.price && (
              <p className="text-[10px] text-gray-400 line-through leading-none mb-0.5">₹{product.mrp}</p>
            )}
            <p className="font-bold text-[15px] text-gray-900 leading-none">₹{product.price}</p>
          </div>

          {qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={!product.inStock}
              className={`shrink-0 border-2 border-primary text-primary px-3 py-[5px] rounded-lg text-[11px] font-bold tracking-wide active:bg-primary/10 transition-colors bg-white ${!product.inStock ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center bg-primary text-white rounded-lg h-[30px] w-[76px]">
              <button
                onClick={(e) => handleUpdate(e, qty - 1)}
                className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-l-lg"
              >
                <Minus size={13} />
              </button>
              <span className="text-[13px] font-bold w-5 text-center">{qty}</span>
              <button
                onClick={(e) => handleUpdate(e, qty + 1)}
                className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-r-lg"
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Category icon tile ────────────────────────────────────────────────────────

function CategoryTile({ cat }: { cat: { id: number; name: string; emoji: string | null; imageUrl: string | null } }) {
  const style = CATEGORY_ICONS[String(cat.id)];
  return (
    <Link href={`/category/${cat.id}`} className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
      <div
        className="w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: style ? style.bg : '#F3F4F6' }}
      >
        {cat.imageUrl ? (
          <img src={cloudinaryOpt(cat.imageUrl, 128) ?? cat.imageUrl} alt={cat.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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

// ── Fallback banner ───────────────────────────────────────────────────────────
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

// ── Home page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const { banners, loading: bannersLoading } = useBanners();
  const { categories, loading: categoriesLoading } = useCategories();

  // Targeted small fetches — no full catalogue load on home screen
  const bestSellers    = useHomeSection('isBestSeller');
  const dwarikaSpecials = useHomeSection('isDwarikaSpecial');

  useEffect(() => {
    if (!emblaApi) return;
    const id = window.setInterval(() => emblaApi.scrollNext(), 3000);
    return () => window.clearInterval(id);
  }, [emblaApi]);

  const displayBanners = !bannersLoading && banners.length > 0 ? banners : FALLBACK_BANNERS;
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
            {displayBanners.map((slide, idx) => (
              <div key={slide.id} className="flex-[0_0_100%] min-w-0">
                {slide.imageUrl ? (
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src={cloudinaryOpt(slide.imageUrl, 780) ?? slide.imageUrl}
                      alt={slide.title}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex flex-col justify-center p-6">
                      <h2 className="text-white font-bold text-2xl mb-1">{slide.title}</h2>
                      {slide.subtitle && <p className="text-white text-sm opacity-90 mb-3">{slide.subtitle}</p>}
                      <button className="bg-white text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm self-start">
                        {slide.buttonText || 'Shop Now'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`${slide.bg || 'bg-gradient-to-r from-primary to-primary/80'} p-6 rounded-2xl h-36 flex flex-col justify-center relative overflow-hidden`}>
                    <div className="relative z-10">
                      <h2 className="text-white font-bold text-2xl mb-1">{slide.title}</h2>
                      {slide.subtitle && <p className="text-white text-sm opacity-90 mb-3">{slide.subtitle}</p>}
                      <button className="bg-white text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                        {slide.buttonText || 'Shop Now'}
                      </button>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-white/20 rounded-full blur-2xl" />
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

      {/* ── Best Sellers ── */}
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

      {/* ── Dwarika Specials ── */}
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
