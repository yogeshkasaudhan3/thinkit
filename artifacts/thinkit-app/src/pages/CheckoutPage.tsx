import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import { MapPin, Phone, Lock, Edit3, CheckCircle2 } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { useApp } from '../context/AppContext';
import CartItemImage from '../components/CartItemImage';
import { useStoreSettings } from '../lib/useStoreSettings';

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { user, cart, cartTotal, paymentMethod, orderNote, clearCart } = useApp();
  const [isPlacing, setIsPlacing] = useState(false);

  // ── Pricing from live store settings ────────────────────────────────────────
  // Must be called unconditionally before any early returns so hook order is stable
  const { settings } = useStoreSettings();

  // Navigate away if no user, or cart is empty and we're not mid-placement.
  // Using useEffect avoids calling setLocation during the render phase, which
  // triggers React's concurrent rendering error.
  // Single effect preserves guard precedence: auth redirect takes priority over cart redirect.
  useEffect(() => {
    if (!user) {
      setLocation('/signin');
    } else if (!isPlacing && cart.length === 0) {
      setLocation('/cart');
    }
  }, [user, isPlacing, cart.length, setLocation]);

  // Render nothing while redirecting
  if (!user || (!isPlacing && cart.length === 0)) return null;
  const handlingFee  = settings.handlingFee;
  const smallCartFee = cartTotal > 0 && cartTotal < settings.smallCartFeeThreshold ? settings.smallCartFee : 0;
  const deliveryFee  = cartTotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
  const grandTotal   = cartTotal + smallCartFee + deliveryFee + handlingFee;

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    try {
      // Server re-derives name/brand/weight/price authoritatively from
      // (productId, variantId) — only identity + qty are actually trusted.
      const items = cart.map(item => ({
        productId: item.product.id,
        variantId: item.variant?.id,
        name: item.product.name,
        brand: item.product.brand,
        weight: item.variant?.weight ?? item.product.weight,
        qty: item.qty,
        price: item.variant?.price ?? item.product.price,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          subtotal: cartTotal,
          smallCartFee,
          deliveryFee,
          handlingFee,
          grandTotal,
          paymentMethod,
          orderNote: orderNote || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string }).error ?? 'Failed to place order. Please try again.');
        setIsPlacing(false);
        return;
      }

      // Order saved — show confirmation, clear cart, redirect
      clearCart();
      // Keep isPlacing=true so the success overlay stays visible
      setTimeout(() => setLocation('/orders'), 1800);
    } catch {
      alert('Network error. Please check your connection and try again.');
      setIsPlacing(false);
    }
  };

  return (
    <motion.div 
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-24 flex flex-col relative"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title="Checkout" showBack />
      
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        
        {/* Customer Info Card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-gray-500 font-medium text-sm">
            <Phone size={16} /> Customer Details
          </div>
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div>
              <p className="font-bold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-600">{user.phone}</p>
            </div>
            <Lock size={16} className="text-gray-400" />
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white p-4 rounded-2xl border-2 border-primary/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
          <div className="flex items-center justify-between mb-3 text-primary font-medium text-sm">
            <div className="flex items-center gap-2">
              <MapPin size={16} /> Delivery Address
            </div>
            <Link href="/profile" className="text-primary hover:bg-primary/10 p-1.5 rounded-full transition-colors">
              <Edit3 size={16} />
            </Link>
          </div>
          <div className="pl-6">
            <p className="font-bold text-gray-900 text-sm">Home</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              {user.flat}, {user.area}<br/>
              {user.landmark && <span>Landmark: {user.landmark}<br/></span>}
              Pincode: {user.pincode}
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Order Summary ({cart.length} Items)</h3>
          <div className="space-y-3 mb-4">
            {cart.map(item => {
              const unitPrice = item.variant?.price ?? item.product.price;
              const weight = item.variant?.weight ?? item.product.weight;
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <CartItemImage
                    imageUrl={item.product.imageUrl}
                    name={item.product.name}
                    brand={item.product.brand}
                    size={44}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium leading-tight line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{item.qty} x ₹{unitPrice}{weight ? ` · ${weight}` : ''}</p>
                  </div>
                  <span className="font-medium text-gray-900 shrink-0 text-sm">₹{item.qty * unitPrice}</span>
                </div>
              );
            })}
          </div>
          
          <div className="border-t border-gray-100 pt-3 space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Items Total</span>
              <span>₹{cartTotal}</span>
            </div>
            {smallCartFee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  Small Cart Fee
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">below ₹{settings.smallCartFeeThreshold}</span>
                </span>
                <span>₹{smallCartFee}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span className={deliveryFee === 0 ? 'text-green-600 font-semibold' : ''}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Handling &amp; Packaging Fee</span>
              <span>₹{handlingFee}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 border-t border-dashed border-gray-200 pt-3 mt-1">
              <span>Grand Total</span>
              <span>₹{grandTotal}</span>
            </div>
          </div>
        </div>

        {/* Extra info */}
        <div className="flex gap-2">
          <div className="bg-white p-3 rounded-xl border border-gray-100 flex-1 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Payment</p>
            <p className="text-sm font-semibold text-primary">{paymentMethod === 'cod' ? 'CASH' : 'UPI'}</p>
          </div>
          {orderNote && (
            <div className="bg-white p-3 rounded-xl border border-gray-100 flex-1 flex items-center justify-center overflow-hidden">
              <p className="text-xs text-gray-600 truncate"><span className="font-bold">Note:</span> {orderNote}</p>
            </div>
          )}
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-white p-4 border-t border-gray-100 z-50">
        <button 
          onClick={handlePlaceOrder}
          disabled={isPlacing}
          className="w-full h-14 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 text-lg active:scale-[0.98] transition-transform shadow-lg shadow-primary/30"
        >
          {isPlacing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
            </motion.div>
          ) : (
            <>Place Order <CheckCircle2 size={20} /></>
          )}
        </button>
      </div>

      {isPlacing && (
        <motion.div 
          className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl mb-6"
          >
            <CheckCircle2 size={48} />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900">Order Confirmed!</h2>
          <p className="text-gray-500 mt-2">Assigning delivery partner...</p>
        </motion.div>
      )}

    </motion.div>
  );
}
