export type Subcategory = string;

export interface Category {
  id: string;
  name: string;
  emoji: string;
  subcategories: Subcategory[];
  productCount: number;
}

/**
 * Alternate pack size for a product (e.g. "1 kg" alongside the product's own
 * base weight). Purely additive — a product with no variants is unaffected.
 */
export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  weight: string;
  mrp: number;
  price: number;
  stockQty: number;
  inStock: boolean;
}

/**
 * Product shape — mirrors the API server's serialized DB row.
 * `color` is optional (kept for any cart items saved in localStorage from
 * the old mock-data era; new DB products derive their color from CATEGORY_COLORS).
 */
export interface Product {
  id: string;
  categoryId: string;
  subcategory?: string | null;
  brand: string;
  name: string;
  weight: string;
  mrp: number;
  price: number;
  inStock: boolean;
  enabled?: boolean;
  imageUrl?: string | null;
  sku?: string | null;
  isBestSeller?: boolean;
  isDwarikaSpecial?: boolean;
  /** Alternate pack sizes — only populated on the single-product fetch. */
  variants?: ProductVariant[];
  /** Legacy field — present on old localStorage cart items only. */
  color?: string;
}

/**
 * Fallback background colour for each category.
 * Used by ProductCard when a product has no imageUrl and no explicit color.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  '1':  '#F5DEB3', // Atta & Rice   — wheat
  '2':  '#AED6F1', // Dairy & Bread — sky blue
  '3':  '#FCF3CF', // Oil & Ghee    — pale yellow
  '4':  '#FADBD8', // Biscuits & Snacks — pink
  '5':  '#E59866', // Masale        — burnt orange
  '6':  '#A9DFBF', // Beverages     — mint green
  '7':  '#D6EAF8', // Home Care     — light blue
  '8':  '#D7BDE2', // Personal Care — lavender
  '9':  '#AED6F1', // Baby Care     — pale blue
  '10': '#F9E79F', // Pooja Items   — gold
  '11': '#EDBB99', // Dry Fruits    — caramel
  '12': '#F4D03F', // Breakfast     — yellow
};

export const CATEGORIES: Category[] = [
  { id: '1',  name: 'Atta & Rice',       emoji: '🌾', subcategories: ['Atta', 'Rice', 'Poha & Dalia', 'Millets'],                productCount: 42 },
  { id: '2',  name: 'Dairy & Bread',     emoji: '🥛', subcategories: ['Milk', 'Butter & Cheese', 'Bread', 'Paneer'],             productCount: 28 },
  { id: '3',  name: 'Oil & Ghee',        emoji: '🛢️', subcategories: ['Ghee', 'Mustard Oil', 'Sunflower Oil', 'Olive Oil'],      productCount: 31 },
  { id: '4',  name: 'Biscuits & Snacks', emoji: '🍪', subcategories: ['Biscuits', 'Namkeen', 'Chips', 'Chocolates'],             productCount: 89 },
  { id: '5',  name: 'Masale',            emoji: '🌶️', subcategories: ['Whole Spices', 'Powdered Spices', 'Blended Spices'],      productCount: 55 },
  { id: '6',  name: 'Beverages',         emoji: '🧃', subcategories: ['Tea & Coffee', 'Cold Drinks', 'Juices', 'Energy Drinks'], productCount: 47 },
  { id: '7',  name: 'Home Care',         emoji: '🧹', subcategories: ['Detergents', 'Dishwash', 'Cleaners', 'Repellents'],       productCount: 34 },
  { id: '8',  name: 'Personal Care',     emoji: '🧴', subcategories: ['Soap & Body Wash', 'Hair Care', 'Oral Care', 'Skin Care'],productCount: 62 },
  { id: '9',  name: 'Baby Care',         emoji: '👶', subcategories: ['Diapers', 'Baby Food', 'Baby Skin Care'],                 productCount: 19 },
  { id: '10', name: 'Pooja Items',       emoji: '🪔', subcategories: ['Agarbatti', 'Camphor', 'Pooja Oil', 'Cotton Wicks'],      productCount: 24 },
  { id: '11', name: 'Dry Fruits',        emoji: '🥜', subcategories: ['Almonds', 'Cashews', 'Raisins', 'Mixed Seeds'],           productCount: 38 },
  { id: '12', name: 'Breakfast',         emoji: '🥣', subcategories: ['Oats', 'Cornflakes', 'Muesli', 'Jams & Spreads'],        productCount: 27 },
];

export const BANNER_SLIDES = [
  { id: 'b1', title: 'Fresh Dairy',           subtitle: 'Delivered in 10 mins',      bg: 'bg-gradient-to-r from-blue-400 to-blue-600',                               textColor: 'text-white', btnStyle: 'default' as const },
  { id: 'b2', title: '🎉 Thinkit Grand Launch', subtitle: 'Free Delivery Above ₹299', bg: 'bg-gradient-to-br from-[#063d28] via-[#0B5D3B] to-[#1a5c36]',             textColor: 'text-white', btnStyle: 'gold'    as const },
  { id: 'b3', title: 'Daily Essentials',       subtitle: 'Stock up your pantry',      bg: 'bg-gradient-to-r from-green-500 to-[#1B4D2E]',                             textColor: 'text-white', btnStyle: 'default' as const },
];

/** Demo order history — purely for UI display, independent of DB products. */
export const ORDERS = [
  {
    id: 'ORD-892374',
    date: new Date().toISOString(),
    status: 'Out For Delivery',
    items: [
      { product: { id: 'p1', name: 'Select Premium Sharbati Atta', brand: 'Aashirvaad', weight: '5 kg', mrp: 280, price: 245, inStock: true, categoryId: '1' } as Product, qty: 1 },
      { product: { id: 'p3', name: 'Butter',                        brand: 'Amul',       weight: '500 g', mrp: 280, price: 255, inStock: true, categoryId: '2' } as Product, qty: 2 },
    ],
    total: 755,
  },
  {
    id: 'ORD-762311',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Delivered',
    items: [
      { product: { id: 'p7',  name: 'G Gold Biscuits',  brand: 'Parle',     weight: '1 kg',  mrp: 120, price: 105, inStock: true, categoryId: '4' } as Product, qty: 3 },
      { product: { id: 'p11', name: 'Premium Tea',       brand: 'Tata Tea',  weight: '1 kg',  mrp: 550, price: 495, inStock: true, categoryId: '6' } as Product, qty: 1 },
    ],
    total: 810,
  },
];
