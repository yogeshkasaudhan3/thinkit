import React from 'react';
import Header from './_shared/Header';
import BottomNav from './_shared/BottomNav';
import { Search, ChevronRight } from 'lucide-react';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from './_shared/mockData';

export default function Home() {
  return (
    <div className="w-[390px] h-[100dvh] bg-gray-50 flex flex-col mx-auto font-sans pb-20 relative">
      <Header />
      
      <div className="flex-1 overflow-y-auto">
        {/* Search Bar */}
        <div className="bg-white px-4 py-3 pb-4 sticky top-0 z-40 border-b border-gray-100">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D2E]/20 focus:border-[#1B4D2E] transition-all"
              placeholder="Search for atta, biscuits, oil..."
            />
            <div className="absolute inset-y-0 right-1 py-1 pr-1 flex items-center">
              <div className="bg-[#1B4D2E]/10 text-[#1B4D2E] text-[10px] font-bold px-2 py-1 rounded-md">
                Search
              </div>
            </div>
          </div>
        </div>

        {/* Banners */}
        <div className="px-4 py-4 flex space-x-3 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <div className="snap-center shrink-0 w-[85%] bg-gradient-to-r from-green-700 to-[#1B4D2E] rounded-2xl p-4 text-white shadow-sm flex relative overflow-hidden">
            <div className="z-10 w-2/3">
              <span className="bg-[#FFD700] text-[#1B4D2E] text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block">Offer</span>
              <h3 className="text-lg font-bold leading-tight mb-1">50% OFF</h3>
              <p className="text-xs text-green-100 mb-3">On all Premium Pulses</p>
              <button className="bg-white text-[#1B4D2E] text-xs font-bold py-1.5 px-3 rounded-full">Shop Now</button>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-80">🫘</div>
          </div>
          <div className="snap-center shrink-0 w-[85%] bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-sm flex relative overflow-hidden">
            <div className="z-10 w-2/3">
              <span className="bg-black/20 text-white text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block">Free Delivery</span>
              <h3 className="text-lg font-bold leading-tight mb-1">Orders ₹299+</h3>
              <p className="text-xs text-orange-100 mb-3">Save ₹20 on delivery</p>
              <button className="bg-white text-red-600 text-xs font-bold py-1.5 px-3 rounded-full">Claim Now</button>
            </div>
            <div className="absolute -right-2 -bottom-2 text-7xl opacity-90">🛵</div>
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 py-2 bg-white mt-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Explore by Category</h2>
            <div className="flex items-center text-xs font-bold text-[#1B4D2E]">
              View All <ChevronRight size={14} className="ml-0.5" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-y-5 gap-x-2">
            {MOCK_CATEGORIES.map(cat => (
              <div key={cat.id} className="flex flex-col items-center group cursor-pointer">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl mb-2 group-active:scale-95 transition-transform border border-gray-100 shadow-sm">
                  {cat.icon}
                </div>
                <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight px-1 h-6 flex items-start justify-center">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Sellers */}
        <div className="py-5 bg-white mt-2 border-t border-gray-100">
          <div className="px-4 flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Best Sellers</h2>
          </div>
          <div className="px-4 flex space-x-3 overflow-x-auto no-scrollbar pb-2">
            {MOCK_PRODUCTS.slice(0, 4).map(product => (
              <div key={product.id} className="shrink-0 w-36 border border-gray-100 rounded-xl p-2.5 relative shadow-sm flex flex-col bg-white">
                <div className={`w-full aspect-square rounded-lg mb-2 flex items-center justify-center ${product.color}`}>
                  <span className="text-4xl opacity-50">🛒</span>
                </div>
                <div className="text-[10px] text-gray-500 font-medium mb-0.5">{product.brand}</div>
                <div className="text-xs font-bold text-gray-800 leading-tight h-8 line-clamp-2 mb-1">{product.name}</div>
                <div className="text-[10px] text-gray-500 mb-2">{product.weight}</div>
                <div className="mt-auto flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-400 line-through">₹{product.mrp}</div>
                    <div className="text-sm font-bold text-[#1B4D2E]">₹{product.price}</div>
                  </div>
                  <button className="bg-white border border-[#1B4D2E] text-[#1B4D2E] font-bold text-xs px-3 py-1.5 rounded-lg active:bg-[#1B4D2E] active:text-white transition-colors">
                    ADD
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <BottomNav activeTab="home" />
    </div>
  );
}
