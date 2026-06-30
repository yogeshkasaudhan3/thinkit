import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../lib/mockData';

export interface CartItem {
  id: string;
  product: Product;
  qty: number;
}

export interface UserProfile {
  name: string;
  phone: string;
  flat: string;
  area: string;
  landmark: string;
  pincode: string;
}

interface AppContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isLoggedIn: boolean;
  paymentMethod: 'cod' | 'upi';
  setPaymentMethod: (method: 'cod' | 'upi') => void;
  orderNote: string;
  setOrderNote: (note: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('thinkit_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('thinkit_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod');
  const [orderNote, setOrderNote] = useState('');

  useEffect(() => {
    localStorage.setItem('thinkit_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('thinkit_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('thinkit_user');
    }
  }, [user]);

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

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, qty } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => total + item.product.price * item.qty, 0);
  const cartCount = cart.reduce((count, item) => count + item.qty, 0);
  const isLoggedIn = !!user;

  return (
    <AppContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        cartTotal,
        cartCount,
        user,
        setUser,
        isLoggedIn,
        paymentMethod,
        setPaymentMethod,
        orderNote,
        setOrderNote,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
