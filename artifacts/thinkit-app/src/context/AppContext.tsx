import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../lib/mockData';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  product: Product;
  qty: number;
}

export interface AuthUser {
  id: number;
  name: string;
  mobile: string;
}

export interface UserAddress {
  id?: number;
  houseNumber: string;
  area: string;
  landmark: string;
  pincode: string;
}

// Backward-compat shape used by existing pages (orders, cart, etc.)
export interface UserProfile {
  name: string;
  phone: string;
  flat: string;
  area: string;
  landmark: string;
  pincode: string;
}

interface AppContextType {
  // ── Auth ──────────────────────────────────────────────────────────────────
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  authUser: AuthUser | null;
  userAddress: UserAddress | null;
  isLoggedIn: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;

  // Backward-compat computed user for existing pages
  user: UserProfile | null;
  /** @deprecated – use refreshAuth/logout instead */
  setUser: (u: UserProfile | null) => void;

  // ── Cart ──────────────────────────────────────────────────────────────────
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;

  // ── Order state ───────────────────────────────────────────────────────────
  paymentMethod: 'cod' | 'upi';
  setPaymentMethod: (method: 'cod' | 'upi') => void;
  orderNote: string;
  setOrderNote: (note: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userAddress, setUserAddress] = useState<UserAddress | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('thinkit_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod');
  const [orderNote, setOrderNote] = useState('');

  useEffect(() => {
    localStorage.setItem('thinkit_cart', JSON.stringify(cart));
  }, [cart]);

  // ── Auth helpers ────────────────────────────────────────────────────────────

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuthUser(data.user);
        setUserAddress(data.address ?? null);
        setAuthStatus('authenticated');
      } else {
        setAuthUser(null);
        setUserAddress(null);
        setAuthStatus('unauthenticated');
      }
    } catch {
      setAuthUser(null);
      setUserAddress(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  useEffect(() => { refreshAuth(); }, [refreshAuth]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore — clear local state regardless
    }
    setAuthUser(null);
    setUserAddress(null);
    setAuthStatus('unauthenticated');
    setCart([]);
    localStorage.removeItem('thinkit_cart');
  }, []);

  // ── Cart helpers ────────────────────────────────────────────────────────────

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { id: product.id, product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) =>
    setCart(prev => prev.filter(item => item.product.id !== productId));

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, qty } : item));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('thinkit_cart');
  };

  const cartTotal = cart.reduce((t, item) => t + item.product.price * item.qty, 0);
  const cartCount = cart.reduce((c, item) => c + item.qty, 0);
  const isLoggedIn = authStatus === 'authenticated' && authUser !== null;

  // ── Backward-compat user object ─────────────────────────────────────────────
  const user: UserProfile | null = authUser
    ? {
        name: authUser.name,
        phone: authUser.mobile,
        flat: userAddress?.houseNumber ?? '',
        area: userAddress?.area ?? '',
        landmark: userAddress?.landmark ?? '',
        pincode: userAddress?.pincode ?? '',
      }
    : null;

  const setUser = (_u: UserProfile | null) => { if (_u === null) logout(); };

  return (
    <AppContext.Provider
      value={{
        authStatus, authUser, userAddress, isLoggedIn, refreshAuth, logout,
        user, setUser,
        cart, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount,
        paymentMethod, setPaymentMethod, orderNote, setOrderNote,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
