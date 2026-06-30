import React from 'react';
import { MapPin, Bell } from 'lucide-react';

export default function Header() {
  return (
    <div className="bg-white border-b border-gray-100 pt-safe z-50 sticky top-0">
      <div className="h-1 bg-[#1B4D2E] w-full"></div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center text-[#1B4D2E] font-bold">
            <MapPin size={18} className="mr-1" />
            <span className="text-sm">Delivering to</span>
          </div>
          <span className="text-gray-600 text-xs ml-5 font-medium truncate w-48">Sector 12, Noida</span>
        </div>
        <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center relative cursor-pointer shadow-sm border border-gray-100">
          <Bell size={20} className="text-[#1B4D2E]" />
          <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
        </div>
      </div>
    </div>
  );
}
