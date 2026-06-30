import React from 'react';
import BottomNav from './_shared/BottomNav';
import { Package, Ticket, PhoneCall, MessageCircle, Star, FileText, LogOut, ChevronRight, Edit2 } from 'lucide-react';

export default function Profile() {
  return (
    <div className="w-[390px] h-[100dvh] bg-gray-50 flex flex-col mx-auto font-sans pb-20 relative">
      <div className="bg-[#1B4D2E] pb-16 pt-8 px-4 rounded-b-[30px] shadow-sm relative z-10">
        <h1 className="text-xl font-bold text-white text-center mb-6">My Profile</h1>
        
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-2xl font-black text-[#1B4D2E] shadow-lg mb-3 relative">
            RK
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#FFD700] rounded-full border-2 border-white flex items-center justify-center">
              <Edit2 size={10} className="text-[#1B4D2E]" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white">Rahul Kumar</h2>
          <p className="text-green-100 text-xs mt-1">+91 98765 43210</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 -mt-8 relative z-20 space-y-4">
        
        {/* Saved Address Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Saved Address</div>
            <div className="font-bold text-gray-900 text-sm">Home</div>
            <div className="text-gray-500 text-xs mt-0.5 w-48 truncate">Flat 4B, Sector 12, Noida</div>
          </div>
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center cursor-pointer">
            <Edit2 size={16} className="text-gray-600" />
          </div>
        </div>

        {/* Menu List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                <Package size={16} className="text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">My Orders</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mr-3">
                <Ticket size={16} className="text-orange-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">My Coupons</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mr-3">
                <PhoneCall size={16} className="text-[#1B4D2E]" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Call Dwarika</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mr-3">
                <MessageCircle size={16} className="text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">WhatsApp Support</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center mr-3">
                <Star size={16} className="text-yellow-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Rate Us</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                <FileText size={16} className="text-gray-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Privacy Policy</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-red-50 active:bg-red-100">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mr-3">
                <LogOut size={16} className="text-red-500" />
              </div>
              <span className="text-sm font-bold text-red-500">Logout</span>
            </div>
          </div>

        </div>

        <div className="text-center pb-8 pt-4">
          <p className="text-[10px] text-gray-400 font-medium">App Version 1.0.0 (Build 42)</p>
          <p className="text-[10px] text-gray-400 font-medium mt-1">Made with ❤️ in India</p>
        </div>
      </div>

      <BottomNav activeTab="profile" />
    </div>
  );
}
