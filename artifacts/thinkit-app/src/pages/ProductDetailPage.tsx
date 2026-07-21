/**
 * Product detail page.
 *
 * Fetches the product directly from /api/products/:id (always correct,
 * regardless of what's in the slim global cache). Similar products come
 * from a small server-side category fetch.
 */
import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { cloudinaryOpt } from '../lib/imgUtils';
import { motion } from 'framer-motion';
import { Star, Clock, ShieldCheck, Plus, Minus } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ProductCard } from './HomePage';
import { CATEGORY_COLORS, type Product, type ProductVariant } from '../lib/mockData';
import { useApp } from '../context/AppContext';

interface PagedResponse { items: Product[]; total: number; hasMore: boolean; }

function useProductById(id: string | undefined): { product: Product | null; loading: boolean } {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    // Clear stale product so we never render the wrong product during transition
    setProduct(null);
    setLoading(true);
    fetch(`/api/products/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) { setProduct(data ?? null); setLoading(false); } })
      .catch(() => { if (!cancelled) { setProduct(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id]);

  return { product, loading };
}

function useSimilarProducts(categoryId: string | undefined, excludeId: string | undefined): Product[] {
  const [similar, setSimilar] = useState<Product[]>([]);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    fetch(`/api/products?categoryId=${categoryId}&limit=5`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() as Promise<PagedResponse> : Promise.reject()))
      .then(({ items }) => {
        if (!cancelled)
          setSimilar(items.filter((p) => p.id !== excludeId).slice(0, 4));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [categoryId, excludeId]);

  return similar;
}

export default function ProductDetailPage() {
  const [, params] = useRoute('/product/:id');
  const productId = params?.id;

  const { product, loading } = useProductById(productId);
  const similarProducts = useSimilarProducts(product?.categoryId, productId);
  const { cart, addToCart, updateQty } = useApp();

  // Selected pack size — `null` means the product's own base weight/price
  // (i.e. today's behaviour). Reset whenever a different product loads.
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  useEffect(() => { setSelectedVariant(null); }, [productId]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!product) return null;

  const hasVariants = !!product.variants && product.variants.length > 0;
  const effectiveColor = product.color || CATEGORY_COLORS[product.categoryId] || '#e8e8e8';
  const displayWeight = selectedVariant?.weight ?? product.weight;
  const displayMrp = selectedVariant?.mrp ?? product.mrp;
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayInStock = selectedVariant ? selectedVariant.inStock : product.inStock;

  const cartItem = cart.find(c => c.product.id === product.id && (c.variant?.id ?? null) === (selectedVariant?.id ?? null));
  const qty = cartItem ? cartItem.qty : 0;

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-white pb-24"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader showBack rightAction={<div className="p-2"/>} />

      <div className="flex flex-col h-full overflow-y-auto">
        {/* Product Image Area */}
        <div
          className="w-full h-72 flex items-center justify-center relative"
          style={{ backgroundColor: `${effectiveColor}20` }}
        >
          {product.imageUrl ? (
            <img
              src={cloudinaryOpt(product.imageUrl, 600) ?? product.imageUrl}
              alt={product.name}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-40 h-40 object-contain"
            />
          ) : (
            <div
              className="w-40 h-40 rounded-full shadow-inner flex items-center justify-center p-4 text-center border-[8px] border-white/50"
              style={{ backgroundColor: effectiveColor }}
            >
              <span className="font-bold text-gray-800 text-lg leading-tight">{product.brand}</span>
            </div>
          )}
          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-700 flex items-center gap-1">
            <Clock size={12} /> 10 MINS
          </div>
        </div>

        {/* Product Info */}
        <div className="p-5 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-500 mb-1">{product.brand}</p>
          <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2">{product.name}</h1>
          <p className="text-sm text-gray-500 mb-4">{displayWeight}</p>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">
              4.5 <Star size={10} className="fill-current" />
            </div>
            <span className="text-xs text-gray-500">142 Ratings</span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-400 line-through text-sm">₹{displayMrp}</span>
                <span className="bg-secondary/20 text-[#B8860B] px-1.5 py-0.5 rounded text-xs font-bold">
                  Save ₹{displayMrp - displayPrice}
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 leading-none">₹{displayPrice}</p>
              <p className="text-[10px] text-gray-400 mt-1">(Inclusive of all taxes)</p>
            </div>
          </div>
        </div>

        {/* Variant selection — only shown when the product has extra pack sizes */}
        {hasVariants && (
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-sm mb-3">Select Pack Size</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedVariant(null)}
                className={`text-left border-2 rounded-xl p-3 min-w-[100px] flex flex-col gap-1 flex-shrink-0 ${
                  selectedVariant === null ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
              >
                <span className="text-xs text-gray-500">{product.weight}</span>
                <span className="font-bold">₹{product.price}</span>
              </button>
              {product.variants!.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => v.inStock && setSelectedVariant(v)}
                  disabled={!v.inStock}
                  className={`text-left border-2 rounded-xl p-3 min-w-[100px] flex flex-col gap-1 flex-shrink-0 ${
                    selectedVariant?.id === v.id ? 'border-primary bg-primary/5' : 'border-gray-200'
                  } ${!v.inStock ? 'opacity-50' : ''}`}
                >
                  <span className="text-xs text-gray-500">{v.weight}</span>
                  <span className="font-bold">₹{v.price}</span>
                  {!v.inStock && <span className="text-[10px] text-red-500 font-semibold">Out of stock</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
            <ShieldCheck className="text-green-600" size={24} />
            <div>
              <h4 className="font-semibold text-sm">Superfast Delivery</h4>
              <p className="text-xs text-gray-500">Get your order delivered in minutes</p>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="py-5">
            <div className="px-5 flex justify-between items-end mb-4">
              <h2 className="font-bold text-lg text-gray-900">Similar Products</h2>
            </div>
            <div className="flex overflow-x-auto gap-3 px-5 pb-4 snap-x no-scrollbar">
              {similarProducts.map(p => (
                <div key={p.id} className="snap-start min-w-[150px] w-[150px]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white p-4 border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40">
        {!displayInStock ? (
          <button disabled className="w-full h-12 bg-gray-200 text-gray-500 font-bold rounded-xl">
            Out of Stock
          </button>
        ) : qty === 0 ? (
          <button
            onClick={() => addToCart(product, selectedVariant)}
            className="w-full h-12 bg-primary text-white font-bold rounded-xl active:scale-[0.98] transition-transform"
          >
            Add to Cart
          </button>
        ) : (
          <div className="w-full h-12 bg-primary text-white rounded-xl flex items-center justify-between px-2">
            <button
              onClick={() => updateQty(product.id, qty - 1, selectedVariant?.id)}
              className="w-12 h-10 flex items-center justify-center active:bg-black/20 rounded-lg"
            >
              <Minus size={20} />
            </button>
            <span className="font-bold text-lg">{qty} in cart</span>
            <button
              onClick={() => updateQty(product.id, qty + 1, selectedVariant?.id)}
              className="w-12 h-10 flex items-center justify-center active:bg-black/20 rounded-lg"
            >
              <Plus size={20} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
