import React, { useState } from 'react';
import BottomNav from './_shared/BottomNav';
import { Package, Clock, PhoneCall, CheckCircle2, ChevronRight } from 'lucide-react';
import { MOCK_ORDERS } from './_shared/mockData';

export default function Orders() {
  const [activeTab, setActiveTab] = useState('active');

  const activeOrders = MOCK_ORDERS.filter(o => o.active);
  const pastOrders = MOCK_ORDERS.filter(o => !o.active);

  return (
    <div className="w-[390px] h-[100dvh] bg-gray-50 flex flex-col mx-auto font-sans pb-20 relative">
      <div className="bg-white flex flex-col shadow-sm z-10 sticky top-0 border-b border-gray-100">
        <div className="px-4 py-4 flex items-center">
          <h1 className="text-lg font-bold text-gray-900">My Orders</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex border-t border-gray-100">
          <div 
            className={`flex-1 py-3 text-center text-sm font-bold cursor-pointer transition-colors border-b-2 ${activeTab === 'active' ? 'border-[#1B4D2E] text-[#1B4D2E]' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('active')}
          >
            Active Orders
          </div>
          <div 
            className={`flex-1 py-3 text-center text-sm font-bold cursor-pointer transition-colors border-b-2 ${activeTab === 'history' ? 'border-[#1B4D2E] text-[#1B4D2E]' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('history')}
          >
            Order History
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'active' && activeOrders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-[#1B4D2E]/20 overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-[#1B4D2E]/10 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-gray-500 font-semibold mb-0.5">{order.date}</div>
                <div className="text-sm font-bold text-gray-900">{order.id}</div>
              </div>
              <div className="bg-[#1B4D2E] text-white text-[10px] font-bold px-2 py-1 rounded flex items-center">
                <Clock size={10} className="mr-1" /> Arriving in 12 min
              </div>
            </div>
            
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-3 shrink-0 text-2xl">🛍️</div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-1">{order.items} items in this order</h3>
                  <p className="text-xs text-gray-500 leading-snug">Aashirvaad Atta, Fortune Oil, Amul Milk + 1 more</p>
                </div>
                <div className="ml-auto font-black text-[#1B4D2E]">₹{order.total}</div>
              </div>

              {/* Stepper */}
              <div className="relative pl-3">
                <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
                <div className="absolute left-[17px] top-2 h-[50%] w-0.5 bg-[#1B4D2E]"></div>
                
                <div className="flex items-center mb-4 relative z-10">
                  <div className="w-3 h-3 rounded-full bg-[#1B4D2E] ring-4 ring-white mr-3"></div>
                  <span className="text-xs font-semibold text-gray-800">Order Received</span>
                </div>
                <div className="flex items-center mb-4 relative z-10">
                  <div className="w-3 h-3 rounded-full bg-[#1B4D2E] ring-4 ring-white mr-3"></div>
                  <span className="text-xs font-semibold text-gray-800">Packed</span>
                </div>
                <div className="flex items-center mb-4 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-[#FFD700] ring-4 ring-white mr-2.5 flex items-center justify-center border-2 border-[#1B4D2E] animate-pulse"></div>
                  <span className="text-xs font-bold text-[#1B4D2E]">Out For Delivery</span>
                </div>
                <div className="flex items-center relative z-10">
                  <div className="w-3 h-3 rounded-full bg-gray-300 ring-4 ring-white mr-3"></div>
                  <span className="text-xs font-semibold text-gray-400">Delivered</span>
                </div>
              </div>
            </div>

            <div className="p-3 flex space-x-3 bg-gray-50/50">
              <button className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold text-xs py-2.5 rounded-xl shadow-sm">
                View Details
              </button>
              <button className="flex-1 bg-[#1B4D2E] text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center">
                <PhoneCall size={14} className="mr-1.5" /> Call Dwarika
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'history' && pastOrders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-xs font-bold text-gray-900 mb-0.5">{order.id}</div>
                <div className="text-[10px] text-gray-500">{order.date}</div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-sm font-black text-gray-900 mb-0.5">₹{order.total}</div>
                <div className="flex items-center text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  <CheckCircle2 size={10} className="mr-1" /> {order.status}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded-lg">
              {order.items} items • Delivered to Home
            </div>
            <button className="w-full bg-white border border-[#1B4D2E] text-[#1B4D2E] font-bold text-xs py-2 rounded-xl active:bg-green-50 transition-colors">
              Reorder Items
            </button>
          </div>
        ))}

        {activeTab === 'active' && activeOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Package size={64} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium text-sm">No active orders</p>
          </div>
        )}
      </div>

      <BottomNav activeTab="orders" />
    </div>
  );
}
