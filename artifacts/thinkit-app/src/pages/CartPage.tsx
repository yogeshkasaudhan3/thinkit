import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, ChevronRight, FileText, IndianRupee } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useApp } from '../context/AppContext';
import CartRecommendations from '../components/CartRecommendations';
import { useStoreSettings } from '../lib/useStoreSettings';

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { cart, cartTotal, cartCount, updateQty, removeFromCart, paymentMethod, setPaymentMethod, orderNote, setOrderNote } = useApp();

  // ── Pricing from live store settings ────────────────────────────────────────
  const { settings } = useStoreSettings();
  const handlingFee  = settings.handlingFee;
  const smallCartFee = cartTotal > 0 && cartTotal < settings.smallCartFeeThreshold ? settings.smallCartFee : 0;
  const deliveryFee  = cartTotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
  const grandTotal   = cartTotal + smallCartFee + deliveryFee + handlingFee;

  if (cart.length === 0) {
    return (
      <motion.div 
        className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <AppHeader title="My Cart" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart size={40} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
          <button 
            onClick={() => setLocation('/home')}
            className="bg-primary text-white font-bold py-3 px-8 rounded-xl active:scale-95 transition-transform"
          >
            Start Shopping
          </button>
        </div>
        <BottomNav />
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-32 flex flex-col"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title={`My Cart (${cartCount})`} showBack />
      
      <div className="flex-1 overflow-y-auto">
        {/* Delivery Time Banner */}
        <div className="bg-blue-50 px-4 py-3 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <ShoppingCart size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Delivery in 10 minutes</p>
            <p className="text-xs text-gray-600">Shipment of {cartCount} item(s)</p>
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-white mt-2 border-y border-gray-100">
          {cart.map((item) => (
            <div key={item.id} className="p-4 flex gap-4 border-b border-gray-50 last:border-0">
              <div 
                className="w-16 h-16 rounded-lg border border-gray-100 flex items-center justify-center relative flex-shrink-0"
                style={{ backgroundColor: `${item.product.color}20` }}
              >
                <div 
                  className="w-10 h-10 rounded-full shadow-inner flex items-center justify-center text-[8px] font-bold border-2 border-white"
                  style={{ backgroundColor: item.product.color }}
                >
                  {item.product.brand}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 leading-tight pr-2">{item.product.name}</h3>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 p-1 -mr-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">{item.variant?.weight ?? item.product.weight}</p>
                
                <div className="mt-auto flex items-center justify-between">
                  <p className="font-bold text-gray-900">₹{item.variant?.price ?? item.product.price}</p>
                  
                  <div className="flex items-center bg-primary text-white rounded-lg h-8 w-[80px]">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-l-lg">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-6 text-center bg-primary">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="flex-1 flex justify-center items-center h-full active:bg-black/10 rounded-r-lg">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Notes */}
        <div className="bg-white mt-2 p-4 border-y border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-gray-500" />
            <h3 className="font-bold text-sm text-gray-900">Delivery Instructions</h3>
          </div>
          <textarea
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="E.g. Don't ring the bell, leave at the door..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none h-20"
          />
        </div>

        {/* Payment Method */}
        <div className="bg-white mt-2 p-4 border-y border-gray-100">
          <h3 className="font-bold text-sm text-gray-900 mb-3">Payment Method</h3>
          <div className="space-y-3">
            <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <IndianRupee size={16} />
                </div>
                <span className="font-medium text-sm text-gray-900">Cash on Delivery</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-primary' : 'border-gray-300'}`}>
                {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
              </div>
              <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
            </label>

            <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'upi' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                  UPI
                </div>
                <span className="font-medium text-sm text-gray-900">UPI at Doorstep</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'upi' ? 'border-primary' : 'border-gray-300'}`}>
                {paymentMethod === 'upi' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
              </div>
              <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} />
            </label>
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-white mt-2 p-4 border-y border-gray-100 mb-6">
          <h3 className="font-bold text-sm text-gray-900 mb-3">Bill Details</h3>

          {/* Smart customer message */}
          {cartTotal > 0 && cartTotal < settings.smallCartFeeThreshold && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">
              <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
              <p className="text-xs text-amber-800 font-medium leading-snug">
                Add ₹{settings.smallCartFeeThreshold - cartTotal} more to remove the Small Cart Fee.
              </p>
            </div>
          )}
          {cartTotal >= settings.smallCartFeeThreshold && cartTotal < settings.freeDeliveryThreshold && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">
              <span className="text-blue-500 text-base leading-none mt-0.5">🚚</span>
              <p className="text-xs text-blue-800 font-medium leading-snug">
                Add ₹{settings.freeDeliveryThreshold - cartTotal} more to get FREE delivery.
              </p>
            </div>
          )}
          {cartTotal >= settings.freeDeliveryThreshold && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">🎉</span>
              <p className="text-xs text-green-800 font-medium leading-snug">
                Congratulations! You have unlocked FREE delivery.
              </p>
            </div>
          )}

          <div className="space-y-3 text-sm">
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
            <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between font-bold text-base text-gray-900">
              <span>Grand Total</span>
              <span>₹{grandTotal}</span>
            </div>
          </div>
        </div>

        {/* ── Smart Recommendations ───────────────────────────────────────────── */}
        <CartRecommendations cartTotal={cartTotal} />
      </div>

      {/* Sticky Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-white p-4 border-t border-gray-100 z-50">
        <button
          onClick={() => setLocation('/checkout')}
          className="w-full flex items-center justify-between p-4 rounded-xl text-white font-bold transition-transform bg-primary active:scale-[0.98]"
        >
          <div className="flex flex-col items-start">
            <span className="text-xs text-white/80 font-normal">₹{grandTotal}</span>
            <span>TOTAL</span>
          </div>
          <div className="flex items-center gap-2">
            Proceed to Checkout <ChevronRight size={18} />
          </div>
        </button>
      </div>

    </motion.div>
  );
}
