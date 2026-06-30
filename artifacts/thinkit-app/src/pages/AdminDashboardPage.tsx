import { motion } from 'framer-motion';
import { Menu, TrendingUp, Package, Clock, Users, Database, Upload, Tag, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  
  const showComingSoon = () => {
    toast({ title: "Coming Soon", description: "This module is under development." });
  };

  const stats = [
    { label: "Today's Orders", value: "47", icon: Package, color: "text-blue-500" },
    { label: "Today's Sales", value: "₹8,420", icon: TrendingUp, color: "text-green-500" },
    { label: "Avg Delivery", value: "18 min", icon: Clock, color: "text-orange-500" },
    { label: "Out For Delivery", value: "12", icon: Users, color: "text-purple-500" },
  ];

  const tools = [
    { label: "Product Management", icon: Database },
    { label: "Bulk CSV Upload", icon: Upload },
    { label: "Order Management", icon: Package },
    { label: "Coupons & Offers", icon: Tag },
    { label: "Banner Management", icon: ImageIcon },
  ];

  return (
    <motion.div 
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="bg-primary text-primary-foreground px-4 py-4 flex items-center justify-between shadow-md">
        <h1 className="font-bold text-lg">Thinkit Admin</h1>
        <button className="p-2 -mr-2 bg-white/10 rounded-lg">
          <Menu size={20} />
        </button>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center ${stat.color}`}>
                  <stat.icon size={16} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
          <div className="col-span-2 bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-xl shadow-sm flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold">3</p>
              <p className="text-sm font-medium opacity-90">New Pending Orders</p>
            </div>
            <button className="bg-white text-red-500 px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
              View
            </button>
          </div>
        </div>

        {/* Quick Tools */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Admin Tools</h2>
          <div className="grid grid-cols-2 gap-3">
            {tools.map((tool, i) => (
              <button 
                key={i}
                onClick={showComingSoon}
                className="bg-white border border-primary/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center shadow-sm active:scale-95 transition-transform"
              >
                <div className="text-primary bg-primary/5 p-3 rounded-full">
                  <tool.icon size={24} />
                </div>
                <span className="text-xs font-semibold text-gray-800">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Orders List */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <h2 className="font-bold text-gray-900">Recent Activity</h2>
            <span className="text-xs text-primary font-semibold">View All</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {[1, 2, 3, 4, 5].map((item, i) => (
              <div key={i} className={`p-3 flex justify-between items-center ${i !== 4 ? 'border-b border-gray-50' : ''}`}>
                <div>
                  <p className="text-sm font-bold text-gray-900">ORD-892{374 - i}</p>
                  <p className="text-xs text-gray-500">Rahul • ₹{450 + i * 50}</p>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold ${
                  i === 0 ? 'bg-orange-100 text-orange-600' : 
                  i === 1 ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  {i === 0 ? 'PENDING' : i === 1 ? 'PACKING' : 'DELIVERED'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
