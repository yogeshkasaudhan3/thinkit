/**
 * Blinkit-style category detail page.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │            AppHeader                │
 *   ├──────────┬──────────────────────────┤
 *   │ Sidebar  │  Product grid            │
 *   │ (90px)   │  (2-col, independent     │
 *   │scrollable│   scroll)                │
 *   ├──────────┴──────────────────────────┤
 *   │            BottomNav                │
 *   └─────────────────────────────────────┘
 *
 * Both the sidebar and product area scroll independently.
 * Switching subcategory is instant — no page reload.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRoute } from 'wouter';
import { motion } from 'framer-motion';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ProductCard } from './HomePage';
import { useProducts } from '../lib/useProducts';
import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubcategoryInfo {
  id: number;
  name: string;
  imageUrl: string | null;
}

const ALL_ID = 0;
const ALL_ENTRY: SubcategoryInfo = { id: ALL_ID, name: 'All', imageUrl: null };

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

// ─── SidebarIcon ──────────────────────────────────────────────────────────────

function SidebarIcon({ sub, active }: { sub: SubcategoryInfo; active: boolean }) {
  const [imgErr, setImgErr] = useState(false);

  // Reset error state whenever the URL changes so a freshly uploaded image renders.
  useEffect(() => { setImgErr(false); }, [sub.imageUrl]);

  const isAll = sub.id === ALL_ID;

  // Two-letter initials from name words; "★" for the All entry
  const initials = isAll
    ? '★'
    : sub.name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        overflow: 'hidden',
        background: bgFromName(sub.name),
        borderWidth: active ? 2 : 1.5,
        borderStyle: 'solid',
        borderColor: active ? '#16A34A' : '#E5E7EB',
        boxShadow: active
          ? '0 2px 8px rgba(22,163,74,0.20)'
          : '0 1px 3px rgba(0,0,0,0.06)',
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
        <span
          style={{
            fontSize: isAll ? 18 : 15,
            fontWeight: 700,
            color: '#374151',
            userSelect: 'none',
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

// ─── SidebarItem ──────────────────────────────────────────────────────────────

function SidebarItem({
  sub,
  active,
  onClick,
}: {
  sub: SubcategoryInfo;
  active: boolean;
  onClick: () => void;
}) {
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
        borderLeft: `3px solid ${active ? '#16A34A' : 'transparent'}`,
        border: 'none',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <SidebarIcon sub={sub} active={active} />
      <span
        style={{
          fontSize: 9.5,
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
  const [category, setCategory] = useState<{
    id: number;
    name: string;
    emoji: string;
  } | null>(null);

  useEffect(() => {
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubcategoryPage() {
  const [, params] = useRoute('/category/:id');
  const categoryId = params?.id;

  const category = useCategoryInfo(categoryId);
  const [activeId, setActiveId] = useState<number>(ALL_ID);
  const prevCategoryIdRef = useRef<string | undefined>(undefined);

  const { products: categoryProducts, loading } = useProducts(
    categoryId ? { categoryId } : undefined,
  );

  // Fetch subcategory list — returns { id, name, imageUrl }[]
  const { data: subcategories = [] } = useQuery<SubcategoryInfo[]>({
    queryKey: ['/api/categories', categoryId, 'subcategories'],
    queryFn: () =>
      fetch(`/api/categories/${categoryId}/subcategories`, {
        credentials: 'include',
      }).then((r) => (r.ok ? r.json() : [])),
    enabled: !!categoryId,
  });

  // Reset to "All" whenever the user navigates to a different category
  useEffect(() => {
    if (prevCategoryIdRef.current !== categoryId) {
      prevCategoryIdRef.current = categoryId;
      setActiveId(ALL_ID);
    }
  }, [categoryId]);

  // "All" entry is always the first item in the sidebar
  const sidebarItems: SubcategoryInfo[] = [ALL_ENTRY, ...subcategories];

  // Filter products instantly — no API call needed
  const displayProducts = useMemo(() => {
    if (activeId === ALL_ID) return categoryProducts;
    const activeSub = subcategories.find((s) => s.id === activeId);
    if (!activeSub) return categoryProducts;
    return categoryProducts.filter(
      (p) => p.subcategory?.trim() === activeSub.name,
    );
  }, [categoryProducts, subcategories, activeId]);

  const activeName =
    activeId === ALL_ID
      ? 'All Products'
      : (subcategories.find((s) => s.id === activeId)?.name ?? 'All Products');

  const title = category?.name ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      style={{
        height: '100dvh',
        width: '100%',
        maxWidth: 390,
        margin: '0 auto',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <AppHeader title={title} showBack />

      {/* ── Body: sidebar + products (each scrolls independently) ──────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left sidebar */}
        <aside
          style={{
            width: 90,
            flexShrink: 0,
            background: '#FAFAFA',
            borderRight: '1px solid #F0F0F0',
            overflowY: 'auto',
            overflowX: 'hidden',
            // @ts-ignore — webkit-specific
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          {sidebarItems.map((sub) => (
            <SidebarItem
              key={sub.id}
              sub={sub}
              active={activeId === sub.id}
              onClick={() => setActiveId(sub.id)}
            />
          ))}
        </aside>

        {/* Right product area */}
        <main
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
          {/* Sticky section header — only when subcategories exist */}
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
              <span
                style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}
              >
                {activeName}
              </span>
              {!loading && (
                <span
                  style={{
                    fontSize: 11,
                    color: '#9CA3AF',
                    marginLeft: 5,
                  }}
                >
                  {displayProducts.length} item
                  {displayProducts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Product grid — bottom padding clears the BottomNav (fixed ~64px + safe area) */}
          <div style={{ padding: '10px 8px', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-green-600 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : displayProducts.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {displayProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
                <span className="text-3xl">📦</span>
                <span className="text-sm text-center px-4">
                  {subcategories.length > 0
                    ? 'No products in this section yet.'
                    : 'No products found in this category.'}
                </span>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Bottom nav ─────────────────────────────────────────────────────── */}
      <BottomNav />
    </motion.div>
  );
}
