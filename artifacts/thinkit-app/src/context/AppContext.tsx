import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, ProductVariant } from '../lib/mockData';

// ─── Types ─────────────────────────────────────────────────────────────────────

// A cart line is uniquely identified by (product.id, variant?.id). When no
// variant is selected the line behaves exactly as it did before variants
// existed — `id` stays equal to `product.id` for backward compatibility with
// any cart already saved in localStorage.
export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant | null;
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
  // True when the customer logged in with a temporary password issued by an
  // admin (manual password reset) and must set a new permanent password
  // before using the rest of the app.
  forcePasswordChange: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  updateAddress: (addr: Omit<UserAddress, 'id'>) => Promise<void>;

  // Backward-compat computed user for existing pages
  user: UserProfile | null;
  /** @deprecated – use refreshAuth/logout instead */
  setUser: (u: UserProfile | null) => void;

  // ── Cart ──────────────────────────────────────────────────────────────────
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant | null) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
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
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

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
    // Inner helper: makes one /api/auth/me attempt and applies the result.
    // Returns true when the state has been resolved (either authenticated or
    // unauthenticated). Throws on network error so the caller can retry.
    const attempt = async (): Promise<void> => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuthUser(data.user);
        setUserAddress(data.address ?? null);
        setForcePasswordChange(Boolean(data.forcePasswordChange));
        setAuthStatus('authenticated');
      } else {
        // Server replied with a non-2xx (e.g. 401) — session is genuinely
        // expired or absent. Clear state immediately.
        setAuthUser(null);
        setUserAddress(null);
        setForcePasswordChange(false);
        setAuthStatus('unauthenticated');
      }
    };

    try {
      await attempt();
    } catch {
      // Network error — NOT a server rejection. On Android, the device is
      // often still establishing its mobile/WiFi connection when the app
      // cold-starts, so the first fetch can throw "TypeError: Failed to fetch"
      // even though the session cookie on the server is completely valid.
      // Waiting 2 s and retrying gives the OS time to bring the radio up.
      // Only if the retry also fails (genuinely offline) do we fall back to
      // 'unauthenticated' — which at least lets the user reach the login form.
      await new Promise<void>(resolve => setTimeout(resolve, 2000));
      try {
        await attempt();
      } catch {
        setAuthUser(null);
        setUserAddress(null);
        setForcePasswordChange(false);
        setAuthStatus('unauthenticated');
      }
    }
  }, []);

  useEffect(() => { refreshAuth(); }, [refreshAuth]);

  const updateAddress = useCallback(async (addr: Omit<UserAddress, 'id'>) => {
    const res = await fetch('/api/auth/address', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addr),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? 'Failed to update address');
    }
    const data = await res.json() as { address: UserAddress };
    setUserAddress(data.address);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore — clear local state regardless
    }
    setAuthUser(null);
    setUserAddress(null);
    setForcePasswordChange(false);
    setAuthStatus('unauthenticated');
    setCart([]);
    localStorage.removeItem('thinkit_cart');
  }, []);

  // ── Cart helpers ────────────────────────────────────────────────────────────
  // Cart line id: plain productId when there's no variant (unchanged from
  // before variants existed), otherwise `${productId}::v${variantId}` so the
  // same product can have multiple independent pack-size lines in the cart.
  const cartLineId = (productId: string, variantId?: string) =>
    variantId ? `${productId}::v${variantId}` : productId;

  const addToCart = (product: Product, variant?: ProductVariant | null) => {
    const id = cartLineId(product.id, variant?.id);
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        return prev.map(item => item.id === id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id, product, variant: variant ?? null, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    const id = cartLineId(productId, variantId);
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQty = (productId: string, qty: number, variantId?: string) => {
    const id = cartLineId(productId, variantId);
    if (qty <= 0) { removeFromCart(productId, variantId); return; }
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty } : item));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('thinkit_cart');
  };

  const lineUnitPrice = (item: CartItem) => item.variant?.price ?? item.product.price;
  const cartTotal = cart.reduce((t, item) => t + lineUnitPrice(item) * item.qty, 0);
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
        authStatus, authUser, userAddress, isLoggedIn, forcePasswordChange, refreshAuth, logout, updateAddress,
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
