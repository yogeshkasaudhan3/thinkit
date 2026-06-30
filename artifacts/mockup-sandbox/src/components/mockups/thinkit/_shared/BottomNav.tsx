import React from 'react';
import { Home, LayoutGrid, ShoppingCart, User, FileText } from 'lucide-react';

interface BottomNavProps {
  activeTab?: 'home' | 'categories' | 'cart' | 'orders' | 'profile';
}

export default function BottomNav({ activeTab = 'home' }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'categories', icon: LayoutGrid, label: 'Categories' },
    { id: 'cart', icon: ShoppingCart, label: 'Cart', badge: 3 },
    { id: 'orders', icon: FileText, label: 'Orders' },
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-2 flex justify-between z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <div key={tab.id} className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer relative">
            <Icon size={24} className={isActive ? 'text-[#1B4D2E]' : 'text-gray-400'} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-[#1B4D2E]' : 'text-gray-400'}`}>
              {tab.label}
            </span>
            {tab.badge && (
              <span className="absolute top-0 right-2 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                {tab.badge}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
