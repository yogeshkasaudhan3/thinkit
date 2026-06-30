import React from 'react';
import BottomNav from './_shared/BottomNav';
import { ArrowLeft, MapPin, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { MOCK_CART } from './_shared/mockData';

export default function Checkout() {
  const subtotal = MOCK_CART.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const isFreeDelivery = subtotal > 299;
  const deliveryFee = isFreeDelivery ? 0 : 20;
  const total = subtotal + deliveryFee + 5; // +5 handling

  return (
    <div className="w-[390px] h-[100dvh] bg-gray-50 flex flex-col mx-auto font-sans pb-20 relative">
      <div className="bg-white px-4 py-4 flex items-center shadow-sm z-10 sticky top-0 border-b border-gray-100">
        <ArrowLeft size={24} className="text-gray-800 mr-3 cursor-pointer" />
        <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Customer Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Details</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 text-sm mb-0.5">Rahul Kumar</div>
              <div className="text-gray-500 text-xs flex items-center">
                <Phone size={12} className="mr-1" /> +91 98765 43210
              </div>
            </div>
            <div className="text-[#1B4D2E] text-xs font-bold bg-green-50 px-2 py-1 rounded">Edit</div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#1B4D2E]/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#1B4D2E]"></div>
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Delivery Address</h2>
            <div className="text-[#1B4D2E] text-xs font-bold bg-green-50 px-2 py-1 rounded">Change</div>
          </div>
          <div className="flex mt-2">
            <MapPin size={18} className="text-[#1B4D2E] mr-2 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-gray-900 text-sm mb-1">Home</div>
              <div className="text-gray-600 text-xs leading-relaxed">
                Flat 4B, 3rd Floor, Tower C<br/>
                Sector 12, Near Mother Dairy<br/>
                Noida, UP - 201301
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Dropdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-bold text-gray-900 text-sm">Order Summary</div>
            <div className="text-gray-500 text-xs mt-0.5">{MOCK_CART.length} items • ₹{total}</div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Details</h2>
          
          <div className="flex items-center p-3 bg-gray-50 rounded-xl mb-4 border border-gray-200">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm mr-3">
              <span className="text-lg">💵</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">Cash on Delivery</div>
              <div className="text-gray-500 text-[10px]">Pay when order arrives</div>
            </div>
            <CheckCircle2 size={18} className="text-[#1B4D2E] ml-auto" />
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Item Total</span>
              <span className="font-semibold text-gray-800">₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Handling Fee</span>
              <span className="font-semibold text-gray-800">₹5</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Delivery Charge</span>
              <span className="font-semibold text-gray-800">₹{deliveryFee}</span>
            </div>
          </div>
          
          <div className="h-px w-full bg-gray-200 border-dashed mb-3"></div>
          
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900 text-sm">Total Amount</span>
            <span className="font-black text-[#1B4D2E] text-base">₹{total}</span>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <div className="bg-white border-t border-gray-100 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] absolute bottom-[60px] left-0 w-full z-20">
        <button className="w-full bg-[#1B4D2E] text-white font-bold text-base py-4 rounded-xl shadow-lg shadow-[#1B4D2E]/30 flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform">
          <span>Place Order</span>
          <CheckCircle2 size={18} />
        </button>
      </div>

      <BottomNav activeTab="cart" />
    </div>
  );
}
