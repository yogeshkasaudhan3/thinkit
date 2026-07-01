import { useRef } from 'react';
import { Plus, Truck, Sparkles, ShoppingBag } from 'lucide-react';
import { PRODUCTS, Product } from '../lib/mockData';
import { useApp } from '../context/AppContext';

// ── Category affinity map ────────────────────────────────────────────────────
// Maps categoryId → related categoryIds (in priority order)
const CATEGORY_AFFINITY: Record<string, string[]> = {
  '1':  ['3', '5', '2', '12'],   // Atta & Rice → Oil, Masale, Dairy, Breakfast
  '2':  ['1', '4', '3', '12'],   // Dairy & Bread → Atta, Biscuits, Oil, Breakfast
  '3':  ['1', '5', '2', '12'],   // Oil & Ghee → Atta, Masale, Dairy, Breakfast
  '4':  ['6', '2', '12', '1'],   // Biscuits & Snacks → Beverages, Dairy, Breakfast, Atta
  '5':  ['1', '3', '2', '4'],    // Masale → Atta, Oil, Dairy, Snacks
  '6':  ['4', '12', '2', '11'],  // Beverages → Biscuits, Breakfast, Dairy, Dry Fruits
  '7':  ['8', '6'],              // Home Care → Personal Care, Beverages
  '8':  ['7', '6'],              // Personal Care → Home Care, Beverages
  '9':  ['8', '2'],              // Baby Care → Personal Care, Dairy
  '10': ['11', '6', '2'],        // Pooja → Dry Fruits, Beverages, Dairy
  '11': ['12', '6', '2'],        // Dry Fruits → Breakfast, Beverages, Dairy
  '12': ['2', '6', '11', '4'],   // Breakfast → Dairy, Beverages, Dry Fruits, Snacks
};

// Curated best-sellers (product IDs) for "You May Also Like"
const BEST_SELLER_IDS = ['p1', 'p22', 'p4', 'p7', 'p21', 'p5', 'p11', 'p9', 'p8', 'p3'];

// ── Mini product card ─────────────────────────────────────────────────────────
function RecoCard({ product }: { product: Product }) {
  const { cart, addToCart, updateQty } = useApp();
  const cartItem = cart.find((c) => c.product.id === product.id);

  return (
    <div className="flex-shrink-0 w-[136px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Image area */}
      <div
        className="h-[100px] flex items-center justify-center"
        style={{ backgroundColor: `${product.color}30` }}
      >
        <div
          className="w-14 h-14 rounded-full shadow-inner flex items-center justify-center text-[9px] font-bold border-2 border-white text-center px-1"
          style={{ backgroundColor: product.color }}
        >
          {product.brand}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-2.5 gap-0.5">
        <p className="text-[11px] font-semibold text-gray-900 leading-tight line-clamp-2">{product.name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{product.weight}</p>

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-sm font-bold text-gray-900">₹{product.price}</span>

          {cartItem ? (
            /* qty stepper */
            <div className="flex items-center bg-primary text-white rounded-lg h-7 w-[64px]">
              <button
                onClick={() => updateQty(cartItem.id, cartItem.qty - 1)}
                className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-l-lg text-base leading-none"
              >
                −
              </button>
              <span className="text-xs font-bold w-5 text-center">{cartItem.qty}</span>
              <button
                onClick={() => updateQty(cartItem.id, cartItem.qty + 1)}
                className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-r-lg text-base leading-none"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(product)}
              className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/30 text-[11px] font-bold rounded-lg px-2 py-1.5 active:scale-95 transition-transform"
            >
              <Plus size={11} strokeWidth={3} />
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal scroll row ─────────────────────────────────────────────────────
function HScrollRow({ products }: { products: Product[] }) {
  const ref = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  return (
    <div
      ref={ref}
      className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide"
      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
    >
      {products.map((p) => (
        <div key={p.id} style={{ scrollSnapAlign: 'start' }}>
          <RecoCard product={p} />
        </div>
      ))}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  subtitle,
  iconBg,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  iconBg: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 mb-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-500 leading-tight">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function CartRecommendations({ cartTotal }: { cartTotal: number }) {
  const { cart } = useApp();

  const cartProductIds = new Set(cart.map((c) => c.product.id));
  const cartCategoryIds = Array.from(new Set(cart.map((c) => c.product.categoryId)));

  // ── "Frequently Bought Together" logic ──────────────────────────────────────
  // Gather related category IDs from all cart categories (deduplicated, priority-ordered)
  const relatedCategoryIds: string[] = [];
  for (const catId of cartCategoryIds) {
    const affinities = CATEGORY_AFFINITY[catId] ?? [];
    for (const rel of affinities) {
      if (!cartCategoryIds.includes(rel) && !relatedCategoryIds.includes(rel)) {
        relatedCategoryIds.push(rel);
      }
    }
  }

  // Preserve affinity priority: sort by position of product's category in relatedCategoryIds
  const frequentlyBought = PRODUCTS.filter(
    (p) => relatedCategoryIds.includes(p.categoryId) && !cartProductIds.has(p.id) && p.inStock,
  )
    .sort(
      (a, b) =>
        relatedCategoryIds.indexOf(a.categoryId) - relatedCategoryIds.indexOf(b.categoryId),
    )
    .slice(0, 10);

  // ── "Free Delivery Assistant" logic ─────────────────────────────────────────
  // Show when delivery is NOT yet free (cartTotal < 150)
  const amountNeeded = cartTotal < 100 ? 100 - cartTotal : cartTotal < 150 ? 150 - cartTotal : 0;
  const showFreeDeliveryAssistant = cartTotal > 0 && cartTotal < 150;

  let freeDeliveryProducts: Product[] = [];
  if (showFreeDeliveryAssistant) {
    // Prioritise products priced in a smart range around amountNeeded
    const lo = Math.max(amountNeeded - 30, 10);
    const hi = amountNeeded + 50;

    const inRange = PRODUCTS.filter(
      (p) => !cartProductIds.has(p.id) && p.inStock && p.price >= lo && p.price <= hi,
    ).sort((a, b) => Math.abs(a.price - amountNeeded) - Math.abs(b.price - amountNeeded));

    const rest = PRODUCTS.filter(
      (p) => !cartProductIds.has(p.id) && p.inStock && !inRange.find((r) => r.id === p.id),
    ).sort((a, b) => a.price - b.price);

    freeDeliveryProducts = [...inRange, ...rest].slice(0, 10);
  }

  // ── "You May Also Like" — best sellers not in cart ──────────────────────────
  const youMayLike = BEST_SELLER_IDS.map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is Product => !!p && !cartProductIds.has(p.id) && p.inStock)
    .slice(0, 10);

  const hasSections =
    (showFreeDeliveryAssistant && freeDeliveryProducts.length > 0) ||
    frequentlyBought.length > 0 ||
    youMayLike.length > 0;
  if (!hasSections) return null;

  return (
    <div className="mt-2 flex flex-col gap-5 pb-4">
      {/* ── Free Delivery Assistant ─────────────────────────────────────────── */}
      {showFreeDeliveryAssistant && freeDeliveryProducts.length > 0 && (
        <div className="bg-white border-y border-gray-100 pt-4">
          {/* CTA banner */}
          <div className="mx-4 mb-3 bg-gradient-to-r from-[#0B5D3B] to-[#1a7a50] rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold leading-snug">
                Complete your order and unlock FREE delivery! 🎉
              </p>
              <p className="text-white/80 text-[11px] leading-tight mt-0.5">
                {cartTotal < 100
                  ? `Add ₹${100 - cartTotal} more to remove Small Cart Fee`
                  : `Just ₹${150 - cartTotal} more for FREE delivery`}
              </p>
            </div>
          </div>

          <SectionHeader
            icon={<Truck size={15} className="text-green-700" />}
            title="Add to Unlock FREE Delivery"
            subtitle="Products chosen to help you save"
            iconBg="bg-green-100"
          />
          <HScrollRow products={freeDeliveryProducts} />
          <div className="pb-4" />
        </div>
      )}

      {/* ── Frequently Bought Together ──────────────────────────────────────── */}
      {frequentlyBought.length > 0 && (
        <div className="bg-white border-y border-gray-100 pt-4">
          <SectionHeader
            icon={<ShoppingBag size={15} className="text-primary" />}
            title="Frequently Bought Together"
            subtitle="Customers also pick these with your items"
            iconBg="bg-primary/10"
          />
          <HScrollRow products={frequentlyBought} />
          <div className="pb-4" />
        </div>
      )}

      {/* ── You May Also Like ───────────────────────────────────────────────── */}
      {youMayLike.length > 0 && (
        <div className="bg-white border-y border-gray-100 pt-4">
          <SectionHeader
            icon={<Sparkles size={15} className="text-yellow-600" />}
            title="You May Also Like"
            subtitle="Best sellers & Dwarika Specials"
            iconBg="bg-yellow-50"
          />
          <HScrollRow products={youMayLike} />
          <div className="pb-4" />
        </div>
      )}
    </div>
  );
}
