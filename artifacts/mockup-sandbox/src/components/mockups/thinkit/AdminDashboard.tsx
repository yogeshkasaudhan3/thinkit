import React from 'react';
import { Menu, TrendingUp, Clock, PackageCheck, AlertCircle, ShoppingBag, Upload, Users, Image as ImageIcon, Ticket } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="w-[390px] h-[100dvh] bg-gray-900 flex flex-col mx-auto font-sans relative">
      {/* Header */}
      <div className="bg-[#11331e] px-4 py-4 flex items-center justify-between shadow-md z-10 sticky top-0 border-b border-green-900/50">
        <div className="flex items-center">
          <Menu size={24} className="text-white mr-3 cursor-pointer" />
          <h1 className="text-lg font-black text-white tracking-wide">
            Think<span className="text-[#FFD700]">it</span> Admin
          </h1>
        </div>
        <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center text-white text-xs font-bold border border-green-700">
          AD
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Top Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10"><TrendingUp size={40} /></div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Today's Sales</div>
            <div className="text-xl font-black text-[#FFD700]">₹8,420</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10"><ShoppingBag size={40} /></div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Today's Orders</div>
            <div className="text-xl font-black text-white">47</div>
          </div>
        </div>

        {/* Operational Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center mr-3">
              <Clock size={14} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">18 min</div>
              <div className="text-[9px] text-gray-400 uppercase">Avg Delivery</div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 flex items-center relative">
            {/* Pulsing badge */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-gray-900"></div>
            
            <div className="w-8 h-8 rounded-full bg-red-900/50 text-red-400 flex items-center justify-center mr-3">
              <AlertCircle size={14} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">3 New</div>
              <div className="text-[9px] text-gray-400 uppercase">Orders</div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 flex items-center">
            <div className="w-8 h-8 rounded-full bg-yellow-900/50 text-yellow-400 flex items-center justify-center mr-3">
              <PackageCheck size={14} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">12 Out</div>
              <div className="text-[9px] text-gray-400 uppercase">For Delivery</div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center mr-3">
              <Clock size={14} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">8 Pending</div>
              <div className="text-[9px] text-gray-400 uppercase">To Pack</div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider pt-2">Management</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform">
            <ShoppingBag size={24} className="text-green-400 mb-2" />
            <span className="text-xs font-semibold text-white">Products</span>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform">
            <Upload size={24} className="text-blue-400 mb-2" />
            <span className="text-xs font-semibold text-white">Bulk CSV Upload</span>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform">
            <Users size={24} className="text-purple-400 mb-2" />
            <span className="text-xs font-semibold text-white">Customers</span>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform">
            <Ticket size={24} className="text-orange-400 mb-2" />
            <span className="text-xs font-semibold text-white">Coupons</span>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform col-span-2">
            <ImageIcon size={24} className="text-pink-400 mb-2" />
            <span className="text-xs font-semibold text-white">Banner Management</span>
          </div>
        </div>

        {/* Recent Orders Table */}
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider pt-2">Live Activity</h2>
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700 text-[10px] font-bold text-gray-500 uppercase">
            <div>Order ID</div>
            <div className="col-span-2">Customer</div>
            <div className="text-right">Amount</div>
          </div>
          
          <div className="divide-y divide-gray-700">
            <div className="grid grid-cols-4 gap-2 px-3 py-3 items-center text-xs">
              <div className="font-bold text-blue-400">#2001</div>
              <div className="col-span-2 text-white truncate">Rahul K. <span className="bg-red-500/20 text-red-400 text-[8px] px-1 ml-1 rounded">NEW</span></div>
              <div className="text-right font-bold text-green-400">₹245</div>
            </div>
            <div className="grid grid-cols-4 gap-2 px-3 py-3 items-center text-xs">
              <div className="font-bold text-blue-400">#2000</div>
              <div className="col-span-2 text-gray-300 truncate">Priya S. <span className="bg-yellow-500/20 text-yellow-400 text-[8px] px-1 ml-1 rounded">PACKING</span></div>
              <div className="text-right font-bold text-green-400">₹1,150</div>
            </div>
            <div className="grid grid-cols-4 gap-2 px-3 py-3 items-center text-xs">
              <div className="font-bold text-blue-400">#1999</div>
              <div className="col-span-2 text-gray-300 truncate">Amit P. <span className="bg-blue-500/20 text-blue-400 text-[8px] px-1 ml-1 rounded">OUT</span></div>
              <div className="text-right font-bold text-green-400">₹450</div>
            </div>
            <div className="grid grid-cols-4 gap-2 px-3 py-3 items-center text-xs">
              <div className="font-bold text-gray-500">#1998</div>
              <div className="col-span-2 text-gray-500 truncate">Neha G. <span className="bg-green-500/20 text-green-400 text-[8px] px-1 ml-1 rounded">DONE</span></div>
              <div className="text-right font-bold text-gray-500">₹80</div>
            </div>
          </div>
          <div className="px-3 py-2 bg-gray-900 border-t border-gray-700 text-center cursor-pointer">
            <span className="text-[10px] font-bold text-blue-400">View All Orders</span>
          </div>
        </div>

      </div>
    </div>
  );
}
