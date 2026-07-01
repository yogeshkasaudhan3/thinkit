export type Subcategory = string;

export interface Category {
  id: string;
  name: string;
  emoji: string;
  subcategories: Subcategory[];
  productCount: number;
}

export interface Product {
  id: string;
  categoryId: string;
  brand: string;
  name: string;
  weight: string;
  mrp: number;
  price: number;
  inStock: boolean;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Atta & Rice', emoji: '🌾', subcategories: ['Atta', 'Rice', 'Poha & Dalia', 'Millets'], productCount: 42 },
  { id: '2', name: 'Dairy & Bread', emoji: '🥛', subcategories: ['Milk', 'Butter & Cheese', 'Bread', 'Paneer'], productCount: 28 },
  { id: '3', name: 'Oil & Ghee', emoji: '🛢️', subcategories: ['Ghee', 'Mustard Oil', 'Sunflower Oil', 'Olive Oil'], productCount: 31 },
  { id: '4', name: 'Biscuits & Snacks', emoji: '🍪', subcategories: ['Biscuits', 'Namkeen', 'Chips', 'Chocolates'], productCount: 89 },
  { id: '5', name: 'Masale', emoji: '🌶️', subcategories: ['Whole Spices', 'Powdered Spices', 'Blended Spices'], productCount: 55 },
  { id: '6', name: 'Beverages', emoji: '🧃', subcategories: ['Tea & Coffee', 'Cold Drinks', 'Juices', 'Energy Drinks'], productCount: 47 },
  { id: '7', name: 'Home Care', emoji: '🧹', subcategories: ['Detergents', 'Dishwash', 'Cleaners', 'Repellents'], productCount: 34 },
  { id: '8', name: 'Personal Care', emoji: '🧴', subcategories: ['Soap & Body Wash', 'Hair Care', 'Oral Care', 'Skin Care'], productCount: 62 },
  { id: '9', name: 'Baby Care', emoji: '👶', subcategories: ['Diapers', 'Baby Food', 'Baby Skin Care'], productCount: 19 },
  { id: '10', name: 'Pooja Items', emoji: '🪔', subcategories: ['Agarbatti', 'Camphor', 'Pooja Oil', 'Cotton Wicks'], productCount: 24 },
  { id: '11', name: 'Dry Fruits', emoji: '🥜', subcategories: ['Almonds', 'Cashews', 'Raisins', 'Mixed Seeds'], productCount: 38 },
  { id: '12', name: 'Breakfast', emoji: '🥣', subcategories: ['Oats', 'Cornflakes', 'Muesli', 'Jams & Spreads'], productCount: 27 },
];

export const PRODUCTS: Product[] = [
  { id: 'p1', categoryId: '1', brand: 'Aashirvaad', name: 'Select Premium Sharbati Atta', weight: '5 kg', mrp: 280, price: 245, inStock: true, color: '#f5dcb3' },
  { id: 'p2', categoryId: '1', brand: 'Fortune', name: 'Rozana Basmati Rice', weight: '1 kg', mrp: 95, price: 82, inStock: true, color: '#e8ddc5' },
  { id: 'p3', categoryId: '2', brand: 'Amul', name: 'Butter', weight: '500 g', mrp: 280, price: 255, inStock: true, color: '#fff9e6' },
  { id: 'p4', categoryId: '2', brand: 'Britannia', name: '100% Whole Wheat Bread', weight: '400 g', mrp: 50, price: 45, inStock: true, color: '#d4b494' },
  { id: 'p5', categoryId: '3', brand: 'Fortune', name: 'Sunlite Refined Sunflower Oil', weight: '1 L', mrp: 145, price: 125, inStock: true, color: '#fcf3cf' },
  { id: 'p6', categoryId: '3', brand: 'Amul', name: 'Pure Ghee', weight: '1 L', mrp: 630, price: 595, inStock: true, color: '#f9e79f' },
  { id: 'p7', categoryId: '4', brand: 'Parle', name: 'G Gold Biscuits', weight: '1 kg', mrp: 120, price: 105, inStock: true, color: '#f5cba7' },
  { id: 'p8', categoryId: '4', brand: 'Haldiram', name: 'Aloo Bhujia', weight: '400 g', mrp: 105, price: 95, inStock: true, color: '#edbb99' },
  { id: 'p9', categoryId: '5', brand: 'MDH', name: 'Garam Masala', weight: '100 g', mrp: 82, price: 75, inStock: true, color: '#d35400' },
  { id: 'p10', categoryId: '5', brand: 'Tata Sampann', name: 'Turmeric Powder', weight: '200 g', mrp: 65, price: 55, inStock: true, color: '#f1c40f' },
  { id: 'p11', categoryId: '6', brand: 'Tata Tea', name: 'Premium', weight: '1 kg', mrp: 550, price: 495, inStock: true, color: '#27ae60' },
  { id: 'p12', categoryId: '6', brand: 'Nescafe', name: 'Classic Coffee', weight: '100 g', mrp: 350, price: 310, inStock: false, color: '#8d6e63' },
  { id: 'p13', categoryId: '7', brand: 'Surf Excel', name: 'Easy Wash Detergent Powder', weight: '1.5 kg', mrp: 195, price: 175, inStock: true, color: '#3498db' },
  { id: 'p14', categoryId: '7', brand: 'Vim', name: 'Dishwash Bar', weight: '300 g', mrp: 30, price: 28, inStock: true, color: '#2ecc71' },
  { id: 'p15', categoryId: '8', brand: 'Dove', name: 'Cream Beauty Bathing Bar', weight: '3x100g', mrp: 180, price: 155, inStock: true, color: '#fdfefe' },
  { id: 'p16', categoryId: '8', brand: 'Colgate', name: 'Strong Teeth Toothpaste', weight: '200 g', mrp: 120, price: 108, inStock: true, color: '#e74c3c' },
  { id: 'p17', categoryId: '9', brand: 'Pampers', name: 'Active Baby Taped Diapers (L)', weight: '62 pcs', mrp: 899, price: 799, inStock: true, color: '#aed6f1' },
  { id: 'p18', categoryId: '10', brand: 'Mangaldeep', name: 'Sandal Agarbatti', weight: '100 sticks', mrp: 60, price: 50, inStock: true, color: '#d2b4de' },
  { id: 'p19', categoryId: '11', brand: 'Happilo', name: 'Premium Californian Almonds', weight: '200 g', mrp: 325, price: 285, inStock: true, color: '#e59866' },
  { id: 'p20', categoryId: '12', brand: 'Kellogg\'s', name: 'Corn Flakes Original', weight: '475 g', mrp: 199, price: 175, inStock: true, color: '#f4d03f' },
  { id: 'p21', categoryId: '4', brand: 'Maggi', name: '2-Minute Noodles Masala', weight: '420 g', mrp: 96, price: 85, inStock: true, color: '#f1c40f' },
  { id: 'p22', categoryId: '2', brand: 'Amul', name: 'Taaza Toned Milk', weight: '1 L', mrp: 70, price: 68, inStock: true, color: '#85c1e9' },
];

export const BANNER_SLIDES = [
  { id: 'b1', title: 'Fresh Dairy', subtitle: 'Delivered in 10 mins', bg: 'bg-gradient-to-r from-blue-400 to-blue-600', textColor: 'text-white', btnStyle: 'default' as const },
  { id: 'b2', title: '🎉 Thinkit Grand Launch', subtitle: 'Free Delivery Above ₹299', bg: 'bg-gradient-to-br from-[#063d28] via-[#0B5D3B] to-[#1a5c36]', textColor: 'text-white', btnStyle: 'gold' as const },
  { id: 'b3', title: 'Daily Essentials', subtitle: 'Stock up your pantry', bg: 'bg-gradient-to-r from-green-500 to-[#1B4D2E]', textColor: 'text-white', btnStyle: 'default' as const },
];

export const ORDERS = [
  {
    id: 'ORD-892374',
    date: new Date().toISOString(),
    status: 'Out For Delivery',
    items: [
      { product: PRODUCTS[0], qty: 1 },
      { product: PRODUCTS[2], qty: 2 },
    ],
    total: 755
  },
  {
    id: 'ORD-762311',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Delivered',
    items: [
      { product: PRODUCTS[6], qty: 3 },
      { product: PRODUCTS[10], qty: 1 },
    ],
    total: 810
  }
];

export const USER_PROFILE = {
  name: 'Rahul Sharma',
  phone: '+91 9876543210',
  flat: 'A-402',
  area: 'Sector 12, Noida',
  landmark: 'Near Metro Station',
  pincode: '201301',
  avatar: 'RS'
};
