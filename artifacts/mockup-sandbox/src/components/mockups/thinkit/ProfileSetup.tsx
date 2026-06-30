import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ProfileSetup() {
  return (
    <div className="w-[390px] h-[100dvh] bg-gray-50 flex flex-col mx-auto font-sans">
      <div className="bg-white px-4 py-4 flex items-center shadow-sm z-10 sticky top-0 border-b border-gray-100">
        <ArrowLeft size={24} className="text-gray-800 mr-3 cursor-pointer" />
        <h1 className="text-lg font-bold text-gray-900">Complete Your Profile</h1>
      </div>
      
      <div className="w-full h-1 bg-gray-200">
        <div className="w-1/3 h-full bg-[#1B4D2E]"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-6 h-6 rounded-full bg-green-100 text-[#1B4D2E] flex items-center justify-center mr-2 text-xs">1</div>
            Personal Details
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Full Name</label>
              <input type="text" placeholder="e.g. Rahul Kumar" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D2E]/20 focus:border-[#1B4D2E] transition-all" />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Mobile Number</label>
              <div className="flex">
                <div className="bg-gray-100 border border-gray-200 rounded-l-xl px-4 py-3.5 text-gray-500 text-sm font-medium border-r-0">
                  +91
                </div>
                <input type="tel" placeholder="98765 43210" className="flex-1 bg-gray-50 border border-gray-200 rounded-r-xl px-4 py-3.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D2E]/20 focus:border-[#1B4D2E] transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-6 h-6 rounded-full bg-green-100 text-[#1B4D2E] flex items-center justify-center mr-2 text-xs">2</div>
            Delivery Address
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">House Number / Flat / Floor</label>
              <input type="text" placeholder="e.g. Flat 4B, 3rd Floor" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D2E]/20 focus:border-[#1B4D2E] transition-all" />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Area / Colony / Street</label>
              <input type="text" placeholder="e.g. Sector 12" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D2E]/20 focus:border-[#1B4D2E] transition-all" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Landmark (Optional)</label>
              <input type="text" placeholder="e.g. Near Mother Dairy" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D2E]/20 focus:border-[#1B4D2E] transition-all" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Pincode</label>
              <input type="text" placeholder="e.g. 201301" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D2E]/20 focus:border-[#1B4D2E] transition-all" />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 w-[390px] bg-white border-t border-gray-100 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button className="w-full bg-[#1B4D2E] text-white font-bold text-base py-4 rounded-xl shadow-lg shadow-[#1B4D2E]/30 active:scale-[0.98] transition-transform">
          Save & Continue
        </button>
      </div>
    </div>
  );
}
