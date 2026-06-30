import React from 'react';
import BottomNav from './_shared/BottomNav';
import { ArrowLeft, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { MOCK_PRODUCTS } from './_shared/mockData';

export default function ProductListing() {
  return (
    <div className="w-[390px] h-[100dvh] bg-gray-50 flex flex-col mx-auto font-sans pb-20 relative">
      <div className="bg-white flex flex-col shadow-sm z-10 sticky top-0 border-b border-gray-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <ArrowLeft size={24} className="text-gray-800 mr-3 cursor-pointer" />
            <h1 className="text-lg font-bold text-gray-900">Biscuits & Snacks</h1>
          </div>
          <div className="flex space-x-3 text-gray-500">
            <ArrowUpDown size={18} className="cursor-pointer" />
            <SlidersHorizontal size={18} className="cursor-pointer" />
          </div>
        </div>
        
        {/* Filter chips */}
        <div className="px-4 py-3 flex space-x-2 overflow-x-auto no-scrollbar border-t border-gray-50">
          <div className="px-4 py-1.5 bg-[#1B4D2E]/10 text-[#1B4D2E] text-xs font-bold rounded-full whitespace-nowrap border border-[#1B4D2E]/20">
            All Items
          </div>
          <div className="px-4 py-1.5 bg-white text-gray-600 text-xs font-semibold rounded-full whitespace-nowrap border border-gray-200">
            Under ₹50
          </div>
          <div className="px-4 py-1.5 bg-white text-gray-600 text-xs font-semibold rounded-full whitespace-nowrap border border-gray-200 flex items-center">
            Top Rated <span className="text-[#FFD700] ml-1">★</span>
          </div>
          <div className="px-4 py-1.5 bg-white text-gray-600 text-xs font-semibold rounded-full whitespace-nowrap border border-gray-200">
            In Stock
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-3">
          {MOCK_PRODUCTS.slice(3, 8).map((product, idx) => (
            <div key={product.id} className="border border-gray-100 rounded-xl p-2.5 relative shadow-sm flex flex-col bg-white">
              {!product.inStock && (
                <div className="absolute inset-0 bg-white/60 z-10 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                  <span className="bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">OUT OF STOCK</span>
                </div>
              )}
              
              <div className={`w-full aspect-square rounded-lg mb-2 flex items-center justify-center ${product.color} relative`}>
                {idx === 0 && (
                  <div className="absolute top-2 left-2 bg-[#1B4D2E] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                    15% OFF
                  </div>
                )}
                <span className="text-4xl opacity-50">🍪</span>
              </div>
              <div className="text-[10px] text-gray-500 font-medium mb-0.5">{product.brand}</div>
              <div className="text-xs font-bold text-gray-800 leading-tight h-8 line-clamp-2 mb-1">{product.name}</div>
              <div className="text-[10px] text-gray-500 mb-2">{product.weight}</div>
              
              <div className="flex items-center space-x-1 mb-3 mt-auto">
                <span className="text-[10px] text-gray-400 line-through">₹{product.mrp}</span>
                <span className="text-sm font-bold text-[#1B4D2E]">₹{product.price}</span>
              </div>

              {product.inStock ? (
                <button className="w-full bg-white border border-[#1B4D2E] text-[#1B4D2E] font-bold text-xs py-2 rounded-lg active:bg-[#1B4D2E] active:text-white transition-colors">
                  ADD
                </button>
              ) : (
                <button className="w-full bg-gray-100 border border-gray-200 text-gray-400 font-bold text-xs py-2 rounded-lg cursor-not-allowed">
                  ADD
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav activeTab="home" />
    </div>
  );
}
