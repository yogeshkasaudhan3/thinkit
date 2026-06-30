import React from 'react';
import BottomNav from './_shared/BottomNav';
import { ArrowLeft, Search } from 'lucide-react';
import { MOCK_SUBCATEGORIES, MOCK_PRODUCTS } from './_shared/mockData';

export default function Subcategory() {
  return (
    <div className="w-[390px] h-[100dvh] bg-gray-50 flex flex-col mx-auto font-sans pb-20 relative">
      <div className="bg-white flex flex-col shadow-sm z-10 sticky top-0 border-b border-gray-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <ArrowLeft size={24} className="text-gray-800 mr-3 cursor-pointer" />
            <h1 className="text-lg font-bold text-gray-900">Atta, Rice & Dal</h1>
          </div>
          <Search size={20} className="text-gray-500 cursor-pointer" />
        </div>
        
        {/* Subcategory chips */}
        <div className="px-4 py-3 flex space-x-2 overflow-x-auto no-scrollbar border-t border-gray-50">
          <div className="px-4 py-1.5 bg-[#1B4D2E] text-white text-xs font-bold rounded-full whitespace-nowrap shadow-sm border border-[#1B4D2E]">
            All
          </div>
          {MOCK_SUBCATEGORIES.map(sub => (
            <div key={sub} className="px-4 py-1.5 bg-white text-gray-600 text-xs font-semibold rounded-full whitespace-nowrap border border-gray-200 shadow-sm active:bg-gray-50">
              {sub}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-3">
          {MOCK_PRODUCTS.slice(0, 6).map(product => (
            <div key={product.id} className="border border-gray-100 rounded-xl p-2.5 relative shadow-sm flex flex-col bg-white">
              {!product.inStock && (
                <div className="absolute inset-0 bg-white/60 z-10 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                  <span className="bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">OUT OF STOCK</span>
                </div>
              )}
              
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
                {product.inStock ? (
                  <button className="bg-white border border-[#1B4D2E] text-[#1B4D2E] font-bold text-xs px-3 py-1.5 rounded-lg active:bg-[#1B4D2E] active:text-white transition-colors">
                    ADD
                  </button>
                ) : (
                  <button className="bg-gray-100 border border-gray-200 text-gray-400 font-bold text-xs px-3 py-1.5 rounded-lg cursor-not-allowed">
                    ADD
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav activeTab="categories" />
    </div>
  );
}
