import { useRoute } from 'wouter';
import { motion } from 'framer-motion';
import { Star, Clock, ShieldCheck, Plus, Minus } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ProductCard } from './HomePage';
import { CATEGORY_COLORS } from '../lib/mockData';
import { useProducts } from '../lib/useProducts';
import { useApp } from '../context/AppContext';

export default function ProductDetailPage() {
  const [, params] = useRoute('/product/:id');
  const productId = params?.id;

  const { allProducts, loading } = useProducts();
  const { cart, addToCart, updateQty } = useApp();

  const product = allProducts.find(p => p.id === productId);

  if (loading && !product) {
    return (
      <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!product) return null;

  const effectiveColor = product.color || CATEGORY_COLORS[product.categoryId] || '#e8e8e8';

  const similarProducts = allProducts
    .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  const cartItem = cart.find(c => c.product.id === product.id);
  const qty = cartItem ? cartItem.qty : 0;

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-white pb-24"
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
              src={product.imageUrl}
              alt={product.name}
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
          <p className="text-sm text-gray-500 mb-4">{product.weight}</p>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">
              4.5 <Star size={10} className="fill-current" />
            </div>
            <span className="text-xs text-gray-500">142 Ratings</span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-400 line-through text-sm">₹{product.mrp}</span>
                <span className="bg-secondary/20 text-[#B8860B] px-1.5 py-0.5 rounded text-xs font-bold">
                  Save ₹{product.mrp - product.price}
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 leading-none">₹{product.price}</p>
              <p className="text-[10px] text-gray-400 mt-1">(Inclusive of all taxes)</p>
            </div>
          </div>
        </div>

        {/* Variant selection (mock) */}
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-sm mb-3">Select Variant</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            <div className="border-2 border-primary bg-primary/5 rounded-xl p-3 min-w-[100px] flex flex-col gap-1 cursor-pointer">
              <span className="text-xs text-gray-500">{product.weight}</span>
              <span className="font-bold">₹{product.price}</span>
            </div>
            <div className="border border-gray-200 rounded-xl p-3 min-w-[100px] flex flex-col gap-1 cursor-pointer opacity-50">
              <span className="text-xs text-gray-500">Large Pack</span>
              <span className="font-bold">₹{product.mrp * 2}</span>
            </div>
          </div>
        </div>

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
            <div className="flex overflow-x-auto gap-4 px-5 pb-4 snap-x no-scrollbar">
              {similarProducts.map(p => (
                <div key={p.id} className="snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-white p-4 border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40">
        {!product.inStock ? (
          <button disabled className="w-full h-12 bg-gray-200 text-gray-500 font-bold rounded-xl">
            Out of Stock
          </button>
        ) : qty === 0 ? (
          <button
            onClick={() => addToCart(product)}
            className="w-full h-12 bg-primary text-white font-bold rounded-xl active:scale-[0.98] transition-transform"
          >
            Add to Cart
          </button>
        ) : (
          <div className="w-full h-12 bg-primary text-white rounded-xl flex items-center justify-between px-2">
            <button
              onClick={() => updateQty(product.id, qty - 1)}
              className="w-12 h-10 flex items-center justify-center active:bg-black/20 rounded-lg"
            >
              <Minus size={20} />
            </button>
            <span className="font-bold text-lg">{qty} in cart</span>
            <button
              onClick={() => updateQty(product.id, qty + 1)}
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
