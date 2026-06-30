import React from 'react';
import BottomNav from './_shared/BottomNav';
import { ArrowLeft, Trash2, CheckCircle2, ChevronRight, FileEdit } from 'lucide-react';
import { MOCK_CART } from './_shared/mockData';

export default function Cart() {
  const subtotal = MOCK_CART.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const isFreeDelivery = subtotal > 299;
  const deliveryFee = isFreeDelivery ? 0 : 20;
  const total = subtotal + deliveryFee;

  return (
    <div className="w-[390px] h-[100dvh] bg-gray-50 flex flex-col mx-auto font-sans pb-20 relative">
      <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0 border-b border-gray-100">
        <div className="flex items-center">
          <ArrowLeft size={24} className="text-gray-800 mr-3 cursor-pointer" />
          <h1 className="text-lg font-bold text-gray-900">My Cart <span className="text-sm font-normal text-gray-500 ml-1">({MOCK_CART.length} items)</span></h1>
        </div>
        <div className="text-sm font-bold text-red-500 cursor-pointer">Clear</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Delivery Note */}
        {!isFreeDelivery && (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-center">
            <span className="text-xs font-semibold text-blue-800">
              Add items worth ₹{299 - subtotal} more for <span className="font-bold">FREE Delivery</span>
            </span>
          </div>
        )}

        {/* Cart Items */}
        <div className="bg-white p-4 mb-2 shadow-sm border-b border-gray-100 space-y-4">
          {MOCK_CART.map((item, idx) => (
            <React.Fragment key={item.product.id}>
              {idx > 0 && <div className="h-px w-full bg-gray-100"></div>}
              <div className="flex items-center">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center mr-3 ${item.product.color} border border-gray-100 shrink-0`}>
                  <span className="text-2xl opacity-50">🛒</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-800 leading-tight mb-1">{item.product.name}</h3>
                  <div className="text-xs text-gray-500 mb-1.5">{item.product.weight}</div>
                  <div className="font-bold text-[#1B4D2E]">₹{item.product.price}</div>
                </div>
                <div className="flex flex-col items-end justify-between h-full space-y-3">
                  <Trash2 size={16} className="text-red-400 cursor-pointer" />
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg">
                    <button className="w-8 h-8 flex items-center justify-center text-gray-600 font-bold active:bg-gray-200 rounded-l-lg">-</button>
                    <span className="w-6 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                    <button className="w-8 h-8 flex items-center justify-center text-[#1B4D2E] font-bold active:bg-gray-200 rounded-r-lg">+</button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Order Notes */}
        <div className="bg-white p-4 mb-2 shadow-sm border-y border-gray-100 flex items-center cursor-pointer">
          <FileEdit size={20} className="text-[#1B4D2E] mr-3" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-800">Add delivery instructions</h4>
            <p className="text-xs text-gray-500">e.g. Leave at door, ring bell</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </div>

        {/* Payment Preferences */}
        <div className="bg-white p-4 mb-2 shadow-sm border-y border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Pay on Delivery</h3>
          <div className="space-y-3">
            <label className="flex items-center p-3 border border-[#1B4D2E] bg-green-50 rounded-xl cursor-pointer">
              <CheckCircle2 size={20} className="text-[#1B4D2E] mr-3 shrink-0" />
              <span className="text-sm font-semibold text-[#1B4D2E]">Cash on Delivery</span>
            </label>
            <label className="flex items-center p-3 border border-gray-200 bg-white rounded-xl cursor-pointer">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3 shrink-0"></div>
              <span className="text-sm font-medium text-gray-700">UPI at Doorstep</span>
            </label>
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-white p-4 pb-8 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Bill Details</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Item Total</span>
              <span className="font-semibold text-gray-800">₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Handling Fee</span>
              <span className="font-semibold text-gray-800">₹5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Charge</span>
              {isFreeDelivery ? (
                <span className="font-semibold text-green-600">FREE</span>
              ) : (
                <span className="font-semibold text-gray-800">₹20</span>
              )}
            </div>
          </div>
          
          <div className="h-px w-full bg-gray-200 border-dashed mb-3"></div>
          
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900 text-base">To Pay</span>
            <span className="font-black text-[#1B4D2E] text-lg">₹{total + 5}</span>
          </div>
          
          <p className="text-[10px] text-center text-gray-400 mt-4">Minimum order value is ₹100</p>
        </div>
      </div>

      {/* Floating Checkout Bar */}
      <div className="absolute bottom-[60px] left-0 w-full p-3 z-20">
        <button className="w-full bg-[#1B4D2E] text-white py-3.5 rounded-xl shadow-lg flex items-center justify-between px-4 active:scale-[0.98] transition-transform">
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold">₹{total + 5}</span>
            <span className="text-[10px] text-green-100 font-medium uppercase tracking-wider">Total</span>
          </div>
          <div className="flex items-center text-sm font-bold">
            Proceed to Checkout <ChevronRight size={18} className="ml-1" />
          </div>
        </button>
      </div>

      <BottomNav activeTab="cart" />
    </div>
  );
}
