import React from 'react';
import BottomNav from './_shared/BottomNav';
import { ArrowLeft, Share2, Star, ChevronRight } from 'lucide-react';
import { MOCK_PRODUCTS } from './_shared/mockData';

export default function ProductDetail() {
  const product = MOCK_PRODUCTS[0];

  return (
    <div className="w-[390px] h-[100dvh] bg-white flex flex-col mx-auto font-sans pb-20 relative overflow-x-hidden">
      {/* Transparent overlay header */}
      <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-20">
        <div className="w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm cursor-pointer">
          <ArrowLeft size={20} className="text-gray-800" />
        </div>
        <div className="w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm cursor-pointer">
          <Share2 size={20} className="text-gray-800" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Large Image Area */}
        <div className="w-full h-[45dvh] bg-orange-50 relative flex items-center justify-center">
          <span className="text-9xl opacity-50 drop-shadow-xl scale-125">🌾</span>
          
          {/* Pagination dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-1.5">
            <div className="w-5 h-1.5 bg-[#1B4D2E] rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Product Info Area */}
        <div className="p-4 bg-white -mt-4 rounded-t-2xl relative z-10 shadow-[0_-8px_15px_rgba(0,0,0,0.02)]">
          <div className="text-sm font-semibold text-gray-500 mb-1">{product.brand}</div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2">{product.name}</h1>
          
          <div className="flex items-center mb-5">
            <div className="flex text-[#FFD700]">
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} className="text-gray-300" />
            </div>
            <span className="text-xs text-gray-500 ml-2 font-medium">4.2 (128 ratings)</span>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-6 flex justify-between items-center">
            <div>
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-black text-[#1B4D2E]">₹{product.price}</span>
                <span className="text-sm text-gray-400 line-through font-medium mb-1">₹{product.mrp}</span>
              </div>
              <div className="text-xs text-green-600 font-bold mt-0.5">
                You save ₹{product.mrp - product.price}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 text-right">
              Inclusive of all taxes
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Select Weight</h3>
            <div className="flex space-x-3 overflow-x-auto no-scrollbar">
              <div className="px-5 py-2.5 border-2 border-[#1B4D2E] bg-green-50 rounded-xl flex flex-col items-center justify-center shrink-0 min-w-[80px]">
                <span className="text-sm font-bold text-[#1B4D2E]">5 kg</span>
                <span className="text-[10px] font-semibold text-gray-500">₹235</span>
              </div>
              <div className="px-5 py-2.5 border border-gray-200 bg-white rounded-xl flex flex-col items-center justify-center shrink-0 min-w-[80px] opacity-60">
                <span className="text-sm font-bold text-gray-600">10 kg</span>
                <span className="text-[10px] font-semibold text-gray-400">₹450</span>
              </div>
              <div className="px-5 py-2.5 border border-gray-200 bg-white rounded-xl flex flex-col items-center justify-center shrink-0 min-w-[80px] opacity-60">
                <span className="text-sm font-bold text-gray-600">1 kg</span>
                <span className="text-[10px] font-semibold text-gray-400">₹50</span>
              </div>
            </div>
          </div>

          <button className="w-full bg-[#1B4D2E] text-white font-bold text-base py-4 rounded-xl shadow-lg shadow-[#1B4D2E]/30 active:scale-[0.98] transition-transform mb-6">
            Add to Cart
          </button>

          <div className="h-px bg-gray-100 w-full mb-6"></div>

          {/* Similar Products */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Similar Products</h2>
              <div className="flex items-center text-xs font-bold text-[#1B4D2E]">
                See All <ChevronRight size={14} className="ml-0.5" />
              </div>
            </div>
            
            <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2">
              {MOCK_PRODUCTS.slice(3, 6).map(item => (
                <div key={item.id} className="shrink-0 w-32 border border-gray-100 rounded-xl p-2 relative shadow-sm flex flex-col bg-white">
                  <div className={`w-full aspect-square rounded-lg mb-2 flex items-center justify-center ${item.color}`}>
                    <span className="text-3xl opacity-50">🛒</span>
                  </div>
                  <div className="text-xs font-bold text-gray-800 leading-tight h-8 line-clamp-2 mb-1">{item.name}</div>
                  <div className="text-[10px] text-gray-500 mb-2">{item.weight}</div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="text-sm font-bold text-[#1B4D2E]">₹{item.price}</div>
                    <div className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center text-[#1B4D2E] font-bold border border-gray-200 text-lg leading-none pb-0.5">+</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
