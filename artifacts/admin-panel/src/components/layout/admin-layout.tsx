import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAdminLogout, useGetAdminMe } from '@workspace/api-client-react';
import { OrderAlarm } from '../order-alarm';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Image as ImageIcon,
  LogOut,
  Store,
  LayoutGrid,
  Settings,
  RefreshCw,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', path: '/orders', icon: ShoppingBag },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Categories', path: '/categories', icon: LayoutGrid },
  { name: 'Banners', path: '/banners', icon: ImageIcon },
  { name: 'Inventory Sync', path: '/inventory-sync', icon: RefreshCw },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: admin } = useGetAdminMe();
  const { mutate: logout, isPending: isLoggingOut } = useAdminLogout();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        setLocation('/login');
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <Store className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground">Thinkit</span>
            <span className="text-xs bg-sidebar-primary text-sidebar-primary-foreground px-1.5 py-0.5 rounded-sm font-semibold ml-1">ADMIN</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}>
                <Icon className={`h-4 w-4 ${isActive ? 'text-sidebar-primary' : ''}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2 text-sm text-sidebar-foreground">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center font-bold text-sidebar-primary">
              {admin?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className="font-medium">{admin?.username || 'Admin'}</span>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" 
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 bg-sidebar border-b border-sidebar-border md:hidden flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <Store className="h-6 w-6" />
            <span className="font-bold text-lg text-sidebar-foreground">Thinkit</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-sidebar-foreground">
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Mobile Nav */}
        <div className="bg-sidebar border-b border-sidebar-border md:hidden overflow-x-auto hide-scrollbar">
          <nav className="flex px-2 py-2 gap-2">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                  isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground/70'
                }`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-sidebar-primary' : ''}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 overflow-auto bg-background p-4 md:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>

      <OrderAlarm />
    </div>
  );
}
