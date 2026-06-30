import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, CheckCircle2, ChevronRight, PhoneCall, Clock } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { ORDERS } from '../lib/mockData';

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const activeOrder = ORDERS[0];
  const historyOrder = ORDERS[1];

  return (
    <motion.div 
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title="My Orders" />
      
      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 flex">
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${activeTab === 'active' ? 'text-primary' : 'text-gray-500'}`}
        >
          Active Orders
          {activeTab === 'active' && (
            <motion.div layoutId="orderTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${activeTab === 'history' ? 'text-primary' : 'text-gray-500'}`}
        >
          Order History
          {activeTab === 'history' && (
            <motion.div layoutId="orderTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'active' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-primary/5 p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 font-medium">ORDER ID</p>
                <p className="font-bold text-gray-900">{activeOrder.id}</p>
              </div>
              <div className="bg-white px-3 py-1 rounded-full border border-primary/20 text-primary text-xs font-bold flex items-center gap-1 shadow-sm">
                <Clock size={12} /> 7 mins away
              </div>
            </div>

            <div className="p-6">
              {/* Stepper */}
              <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-2">
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 size={10} className="text-white" />
                  </div>
                  <p className="font-bold text-sm text-gray-900">Order Received</p>
                  <p className="text-xs text-gray-500">10:42 AM</p>
                </div>
                
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 size={10} className="text-white" />
                  </div>
                  <p className="font-bold text-sm text-gray-900">Items Packed</p>
                  <p className="text-xs text-gray-500">10:45 AM</p>
                </div>
                
                <div className="relative pl-6">
                  <div className="absolute -left-[11px] -top-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                  </div>
                  <p className="font-bold text-sm text-primary">Out For Delivery</p>
                  <p className="text-xs text-gray-500">Ramesh is on the way</p>
                </div>
                
                <div className="relative pl-6 opacity-40">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-gray-300" />
                  <p className="font-bold text-sm text-gray-900">Delivered</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 space-y-2">
              <p className="text-sm font-semibold text-gray-900">{activeOrder.items.length} Items • ₹{activeOrder.total}</p>
              <p className="text-xs text-gray-500 truncate">
                {activeOrder.items.map(i => `${i.qty}x ${i.product.name}`).join(', ')}
              </p>
            </div>

            <div className="p-4 flex gap-3 border-t border-gray-100">
              <button className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 active:bg-gray-50">
                View Details
              </button>
              <button className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-primary/90">
                <PhoneCall size={16} /> Call Driver
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Delivered</p>
                    <p className="text-xs text-gray-500">Oct 12, 09:30 AM</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900">₹{historyOrder.total}</p>
              </div>
              
              <p className="text-xs text-gray-600 line-clamp-1 px-1">
                {historyOrder.items.map(i => `${i.qty}x ${i.product.name}`).join(', ')}
              </p>
              
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-400">{historyOrder.id}</p>
                <button className="text-primary text-sm font-semibold flex items-center gap-1">
                  Reorder <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </motion.div>
  );
}
