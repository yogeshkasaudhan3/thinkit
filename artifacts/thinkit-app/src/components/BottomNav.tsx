import { Link, useLocation } from 'wouter';
import { Home, LayoutGrid, ShoppingCart, Clock, User } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const [location] = useLocation();
  const { cartCount } = useApp();

  const tabs = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Categories', path: '/categories', icon: LayoutGrid },
    { name: 'Cart', path: '/cart', icon: ShoppingCart },
    { name: 'Orders', path: '/orders', icon: Clock },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-gray-100 px-2 pb-safe pt-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40">
      <div className="flex justify-between items-center h-14">
        {tabs.map((tab) => {
          const isActive = location.startsWith(tab.path) || (tab.path === '/categories' && location.startsWith('/category/'));
          const Icon = tab.icon;

          return (
            <Link key={tab.path} href={tab.path} className="flex-1 flex flex-col items-center justify-center gap-1 relative" replace>
              <div className={`transition-colors duration-200 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                {tab.name}
              </span>
              
              {tab.name === 'Cart' && cartCount > 0 && (
                <span className="absolute top-0 right-[20%] bg-secondary text-secondary-foreground text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
