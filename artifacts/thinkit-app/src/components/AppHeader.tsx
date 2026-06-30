import { Link, useLocation } from 'wouter';
import { ChevronLeft, MapPin, Bell, User as UserIcon, Search, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showAddress?: boolean;
  showNotification?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export default function AppHeader({ 
  title, 
  showBack, 
  showAddress, 
  showNotification,
  onBack,
  rightAction
}: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const { user } = useApp();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  if (showAddress) {
    return (
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden pr-4 cursor-pointer" onClick={() => setLocation('/profile')}>
          <div className="bg-white/20 p-2 rounded-full">
            <MapPin size={20} className="text-secondary" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-medium text-white/80">Delivering to</span>
            <span className="text-sm font-semibold truncate">
              {user ? `${user.area}, ${user.pincode}` : 'Select Address'}
            </span>
          </div>
        </div>
        
        {showNotification && (
          <div className="relative p-2 bg-white/10 rounded-full cursor-pointer">
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-secondary rounded-full border border-primary"></span>
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
      <div className="w-10 flex items-center justify-start">
        {showBack && (
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-700"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>
      
      <div className="flex-1 text-center font-semibold text-lg text-foreground truncate px-2">
        {title}
      </div>
      
      <div className="w-10 flex items-center justify-end">
        {rightAction}
      </div>
    </header>
  );
}
