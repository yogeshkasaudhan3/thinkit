import React from 'react';
import BottomNav from './_shared/BottomNav';
import { ArrowLeft } from 'lucide-react';
import { MOCK_CATEGORIES } from './_shared/mockData';

export default function Categories() {
  return (
    <div className="w-[390px] h-[100dvh] bg-gray-50 flex flex-col mx-auto font-sans pb-20 relative">
      <div className="bg-white px-4 py-4 flex items-center shadow-sm z-10 sticky top-0 border-b border-gray-100">
        <ArrowLeft size={24} className="text-gray-800 mr-3 cursor-pointer" />
        <h1 className="text-lg font-bold text-gray-900">All Categories</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-3">
          {MOCK_CATEGORIES.map((cat, idx) => {
            // Generate some mock counts
            const itemCount = 120 + (idx * 17);
            
            return (
              <div key={cat.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-3 shadow-inner">
                  {cat.icon}
                </div>
                <h3 className="text-sm font-bold text-gray-800 text-center mb-1">{cat.name}</h3>
                <span className="text-[10px] text-gray-400 font-medium">{itemCount} items</span>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav activeTab="categories" />
    </div>
  );
}
