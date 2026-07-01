import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Package, Ticket, Phone, MessageCircle, Star, FileText, LogOut, ChevronRight, Edit3 } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useApp } from '../context/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useApp();
  const { toast } = useToast();

  if (!user) {
    setLocation('/signin');
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setLocation('/signin');
  };

  const showToast = (msg: string) => {
    toast({ title: msg, duration: 2000 });
  };

  const menuItems = [
    { icon: Package, label: 'My Orders', onClick: () => setLocation('/orders'), color: 'text-blue-500' },
    { icon: Ticket, label: 'My Coupons', onClick: () => showToast('No coupons yet'), color: 'text-orange-500' },
    { icon: Phone, label: 'Call Dwarika', onClick: () => window.location.href = 'tel:1800123456', color: 'text-green-600' },
    { icon: MessageCircle, label: 'WhatsApp Support', onClick: () => window.open('https://wa.me/919876543210', '_blank'), color: 'text-[#25D366]' },
    { icon: Star, label: 'Rate Us', onClick: () => showToast('Thank you for rating!'), color: 'text-yellow-500' },
    { icon: FileText, label: 'Privacy Policy', onClick: () => showToast('Coming soon'), color: 'text-gray-500' },
  ];

  return (
    <motion.div 
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title="My Profile" />

      <div className="p-4 flex-1 overflow-y-auto">
        
        {/* Profile Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-inner">
            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{user.phone}</p>
          </div>
          <button 
            onClick={() => setLocation('/setup')}
            className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600"
          >
            <Edit3 size={18} />
          </button>
        </div>

        {/* Address summary */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Saved Address</span>
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Home</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">
            <span className="font-semibold">{user.flat}</span><br />
            {user.area}<br />
            {user.pincode}
          </p>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          {menuItems.map((item, index) => (
            <button 
              key={index}
              onClick={item.onClick}
              className={`w-full flex items-center p-4 active:bg-gray-50 transition-colors ${index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center ${item.color} mr-3`}>
                <item.icon size={18} />
              </div>
              <span className="flex-1 text-left font-medium text-gray-800 text-sm">{item.label}</span>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="w-full bg-white border border-red-100 text-red-500 rounded-2xl p-4 flex items-center justify-center gap-2 font-bold shadow-sm active:bg-red-50 transition-colors"
        >
          <LogOut size={18} /> Log Out
        </button>

        <div className="text-center mt-8 mb-4">
          <p className="text-gray-400 text-xs">Thinkit by Dwarika v1.0.0</p>
        </div>

      </div>

      <BottomNav />
    </motion.div>
  );
}
