/**
 * Blinkit-style category detail page.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │            AppHeader                │
 *   ├──────────┬──────────────────────────┤
 *   │ Sidebar  │  Product grid            │
 *   │ (90px)   │  (2-col, independent     │
 *   │scrollable│   scroll + infinite)     │
 *   ├──────────┴──────────────────────────┤
 *   │            BottomNav                │
 *   └─────────────────────────────────────┘
 *
 * Products are fetched server-side with pagination (20 / page).
 * Selecting a subcategory filters server-side — no full-catalogue preload.
 * IntersectionObserver at the bottom of the grid triggers loadMore().
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRoute } from 'wouter';
import { motion } from 'framer-motion';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ProductCard } from './HomePage';
import { useCategoryProducts } from '../lib/useCategoryProducts';
import { useQuery } from '@tanstack/react-query';
import { usePreloadImages } from '../lib/usePreloadImages';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubcategoryInfo {
  id: number;
  name: string;
  imageUrl: string | null;
}

const ALL_ID = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PASTEL_PALETTE = [
  '#FEF9C3', '#FFF7ED', '#FEF3C7', '#F0FDF4', '#FDF4FF',
  '#FFF1F2', '#F0F9FF', '#F5F3FF', '#EFF6FF', '#FDF2F8',
];

function bgFromName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PASTEL_PALETTE[Math.abs(h) % PASTEL_PALETTE.length];
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-pulse">
      {/* Aspect-ratio matches ProductCard image area so skeleton has the same height */}
      <div className="w-full bg-gray-100" style={{ aspectRatio: '1 / 1' }} />
      <div className="px-2.5 pt-2 pb-2.5 flex flex-col gap-2">
        <div className="h-2.5 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
        <div className="h-7 bg-gray-100 rounded-lg w-full mt-2" />
      </div>
    </div>
  );
}

// ─── SidebarIcon ──────────────────────────────────────────────────────────────

function SidebarIcon({ sub, active }: { sub: SubcategoryInfo; active: boolean }) {
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => { setImgErr(false); }, [sub.imageUrl]);

  const initials = sub.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div
      style={{
        /* Icon scales from 42 px (360 dp) to 52 px (480 dp) so it always fits the sidebar */
        width: 'clamp(42px, 11.5vw, 52px)',
        height: 'clamp(42px, 11.5vw, 52px)',
        borderRadius: 12,
        overflow: 'hidden',
        background: bgFromName(sub.name),
        borderWidth: active ? 2 : 1.5,
        borderStyle: 'solid',
        borderColor: active ? '#16A34A' : '#E5E7EB',
        boxShadow: active ? '0 2px 8px rgba(22,163,74,0.20)' : '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {sub.imageUrl && !imgErr ? (
        <img
          src={sub.imageUrl}
          alt={sub.name}
          loading="lazy"
          decoding="async"
          onError={() => setImgErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: 'clamp(12px, 3.5vw, 15px)', fontWeight: 700, color: '#374151', userSelect: 'none' }}>
          {initials}
        </span>
      )}
    </div>
  );
}

// ─── SidebarItem ──────────────────────────────────────────────────────────────

function SidebarItem({ sub, active, onClick }: { sub: SubcategoryInfo; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        padding: '10px 6px',
        gap: 5,
        background: active ? '#F0FDF4' : 'transparent',
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderLeft: `3px solid ${active ? '#16A34A' : 'transparent'}`,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <SidebarIcon sub={sub} active={active} />
      <span
        style={{
          fontSize: 'clamp(8.5px, 2.3vw, 10px)',
          fontWeight: active ? 700 : 500,
          color: active ? '#16A34A' : '#6B7280',
          textAlign: 'center',
          lineHeight: 1.3,
          wordBreak: 'break-word',
          width: '100%',
        }}
      >
        {sub.name}
      </span>
    </button>
  );
}

// ─── Category info hook ───────────────────────────────────────────────────────

function useCategoryInfo(id: string | undefined) {
  const [category, setCategory] = useState<{ id: number; name: string; emoji: string } | null>(null);

  useEffect(() => {
    setCategory(null);
    if (!id) return;
    let cancelled = false;
    fetch('/api/categories', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((cats: { id: number; name: string; emoji: string }[]) => {
        if (!cancelled) setCategory(cats.find((c) => String(c.id) === id) ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  return category;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubcategoryPage() {
  const [, params] = useRoute('/category/:id');
  const categoryId = params?.id;

  const category = useCategoryInfo(categoryId);
  const [activeId, setActiveId] = useState<number>(ALL_ID);
  const prevCategoryIdRef = useRef<string | undefined>(undefined);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const productListRef = useRef<HTMLElement>(null);

  // Reset to unselected (ALL_ID sentinel) whenever the user navigates to a
  // different category so the auto-select below fires for the new list.
  useEffect(() => {
    if (prevCategoryIdRef.current !== categoryId) {
      prevCategoryIdRef.current = categoryId;
      setActiveId(ALL_ID);
    }
  }, [categoryId]);

  // Fetch subcategory list — returns { id, name, imageUrl }[]
  const { data: subcategories = [] } = useQuery<SubcategoryInfo[]>({
    queryKey: ['/api/categories', categoryId, 'subcategories'],
    queryFn: () =>
      fetch(`/api/categories/${categoryId}/subcategories`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : [])),
    enabled: !!categoryId,
  });

  // Auto-select the first subcategory once the list loads (or when the
  // category changes and the new list arrives).
  useEffect(() => {
    if (subcategories.length > 0) {
      const valid = subcategories.some((s) => s.id === activeId);
      if (!valid) setActiveId(subcategories[0].id);
    }
  }, [subcategories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive the active subcategory name for server-side filtering.
  const activeSubName = subcategories.find((s) => s.id === activeId)?.name ?? null;

  const { products, loading, loadingMore, hasMore, total, loadMore } =
    useCategoryProducts(categoryId, activeSubName);

  // Show in-stock products first; preserve relative order within each group
  const displayProducts = useMemo(() => [
    ...products.filter(p => p.inStock),
    ...products.filter(p => !p.inStock),
  ], [products]);

  // Preload first 6 above-the-fold images whenever the product list changes
  usePreloadImages(displayProducts, 6);

  // Reset product list scroll to top whenever the active subcategory changes
  useEffect(() => {
    if (productListRef.current) {
      productListRef.current.scrollTop = 0;
    }
  }, [activeId]);

  // IntersectionObserver fires loadMore when the sentinel enters the viewport
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

  const activeName = subcategories.find((s) => s.id === activeId)?.name ?? '';
  const title = category?.name ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      style={{
        height: '100dvh',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <AppHeader title={title} showBack />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left sidebar — width scales from 80 px (360 dp) to 100 px (480 dp) */}
        <aside
          style={{
            width: 'clamp(80px, 22vw, 100px)',
            flexShrink: 0,
            background: '#FAFAFA',
            borderRight: '1px solid #F0F0F0',
            overflowY: 'auto',
            overflowX: 'hidden',
            // @ts-ignore
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          <div style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
            {subcategories.map((sub) => (
              <SidebarItem
                key={sub.id}
                sub={sub}
                active={activeId === sub.id}
                onClick={() => setActiveId(sub.id)}
              />
            ))}
          </div>
        </aside>

        {/* Right product area */}
        <main
          ref={productListRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: '#F8F9FA',
            // @ts-ignore
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          {/* Sticky section header */}
          {subcategories.length > 0 && (
            <div
              style={{
                padding: '10px 12px 8px',
                background: '#ffffff',
                borderBottom: '1px solid #F0F0F0',
                position: 'sticky',
                top: 0,
                zIndex: 5,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                {activeName}
              </span>
              {!loading && (
                <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 5 }}>
                  {total} item{total !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Product grid */}
          <div
            style={{
              padding: '10px 8px',
              paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {loading ? (
              /* First-page skeleton — 6 cards in a 2-col grid */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : displayProducts.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {displayProducts.map((product, index) => (
                    // priority=true for the first 6 cards (3 rows × 2 cols) —
                    // the typical above-the-fold count on a 390 px mobile screen
                    <ProductCard key={product.id} product={product} priority={index < 6} />
                  ))}
                  {/* Skeleton rows while loading more */}
                  {loadingMore && Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
                </div>
                {/* Infinite-scroll sentinel */}
                <div ref={sentinelRef} style={{ height: 1 }} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
                <span className="text-3xl">📦</span>
                <span className="text-sm text-center px-4">
                  No products in this subcategory yet.
                </span>
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNav />
    </motion.div>
  );
}
