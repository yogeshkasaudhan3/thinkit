export const MOCK_CATEGORIES = [
  { id: '1', name: 'Atta, Rice & Dal', icon: '🌾' },
  { id: '2', name: 'Dairy & Bread', icon: '🥛' },
  { id: '3', name: 'Oil & Ghee', icon: '🫙' },
  { id: '4', name: 'Biscuits & Snacks', icon: '🍪' },
  { id: '5', name: 'Masale', icon: '🌶️' },
  { id: '6', name: 'Beverages', icon: '🧃' },
  { id: '7', name: 'Home Care', icon: '🧹' },
  { id: '8', name: 'Personal Care', icon: '🧴' },
  { id: '9', name: 'Baby Care', icon: '👶' },
  { id: '10', name: 'Pooja Items', icon: '🪔' },
  { id: '11', name: 'Dry Fruits', icon: '🥜' },
  { id: '12', name: 'Breakfast', icon: '🥣' }
];

export const MOCK_SUBCATEGORIES = [
  'Atta', 'Rice', 'Dal', 'Besan', 'Suji', 'Poha', 'Daliya'
];

export const MOCK_PRODUCTS = [
  { id: 'p1', name: 'Aashirvaad Shudh Chakki Atta', brand: 'Aashirvaad', weight: '5 kg', mrp: 250, price: 235, inStock: true, color: 'bg-orange-100' },
  { id: 'p2', name: 'Amul Taaza Toned Milk', brand: 'Amul', weight: '500 ml', mrp: 28, price: 28, inStock: true, color: 'bg-blue-100' },
  { id: 'p3', name: 'Fortune Sunlite Refined Oil', brand: 'Fortune', weight: '1 L', mrp: 180, price: 165, inStock: true, color: 'bg-yellow-100' },
  { id: 'p4', name: 'Britannia NutriChoice Digestives', brand: 'Britannia', weight: '250 g', mrp: 60, price: 55, inStock: true, color: 'bg-red-100' },
  { id: 'p5', name: 'MDH Garam Masala', brand: 'MDH', weight: '100 g', mrp: 85, price: 82, inStock: true, color: 'bg-green-100' },
  { id: 'p6', name: 'Brooke Bond Red Label Tea', brand: 'Brooke Bond', weight: '500 g', mrp: 290, price: 275, inStock: true, color: 'bg-red-200' },
  { id: 'p7', name: 'Haldiram\'s Bhujia Sev', brand: 'Haldiram\'s', weight: '400 g', mrp: 110, price: 105, inStock: true, color: 'bg-yellow-200' },
  { id: 'p8', name: 'India Gate Basmati Rice', brand: 'India Gate', weight: '1 kg', mrp: 150, price: 135, inStock: false, color: 'bg-emerald-100' }
];

export const MOCK_CART = [
  { product: MOCK_PRODUCTS[0], quantity: 1 },
  { product: MOCK_PRODUCTS[1], quantity: 2 },
  { product: MOCK_PRODUCTS[6], quantity: 1 }
];

export const MOCK_ORDERS = [
  { id: 'TKT-2025001', date: 'Oct 24, 2023, 10:30 AM', status: 'Out For Delivery', items: 4, total: 245, active: true, step: 2 },
  { id: 'TKT-2025002', date: 'Oct 20, 2023, 05:15 PM', status: 'Delivered', items: 12, total: 1150, active: false, step: 4 },
  { id: 'TKT-2025003', date: 'Oct 15, 2023, 08:45 AM', status: 'Delivered', items: 2, total: 120, active: false, step: 4 }
];
