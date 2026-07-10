import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  CheckCircle2,
  ChevronRight,
  Clock,
  XCircle,
  RotateCcw,
  ShoppingCart,
  Loader2,
  AlertCircle,
  CreditCard,
  Banknote,
} from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useApp } from '../context/AppContext';
import { Product } from '../lib/mockData';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  weight: string;
  qty: number;
  price: number;
}

interface OrderAddress {
  houseNumber: string;
  area: string;
  landmark: string;
  pincode: string;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  grandTotal: number;
  subtotal: number;
  smallCartFee: number;
  deliveryFee: number;
  handlingFee: number;
  paymentMethod: string;
  orderNote?: string | null;
  items: OrderItem[];
  address: OrderAddress;
  createdAt: string;
  updatedAt: string;
  // Cancellation
  cancellationReason?: string | null;
  // Payment collection (set after delivery)
  paymentStatus?: 'paid' | 'unpaid' | null;
  paymentCollectionMethod?: 'cash' | 'upi' | 'mixed' | null;
  cashAmount?: number | null;
  upiAmount?: number | null;
}

// ── Status config ─────────────────────────────────────────────────────────────

const ACTIVE_STEPS = [
  { status: 'new',              label: 'Order Placed'     },
  { status: 'accepted',         label: 'Accepted'         },
  { status: 'packing',          label: 'Packing'          },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered',        label: 'Delivered'        },
];

const ACTIVE_STATUSES = new Set(['new', 'accepted', 'packing', 'out_for_delivery']);

function currentStepIndex(status: string) {
  return ACTIVE_STEPS.findIndex(s => s.status === status);
}

function statusColor(status: string) {
  return {
    new:              'text-red-600 bg-red-50',
    accepted:         'text-blue-600 bg-blue-50',
    packing:          'text-orange-600 bg-orange-50',
    out_for_delivery: 'text-yellow-700 bg-yellow-50',
    delivered:        'text-green-600 bg-green-50',
    cancelled:        'text-gray-500 bg-gray-100',
  }[status] ?? 'text-gray-500 bg-gray-100';
}

function statusDisplayLabel(status: string) {
  return {
    new:              'Order Placed',
    accepted:         'Accepted',
    packing:          'Packing',
    out_for_delivery: 'Out for Delivery',
    delivered:        'Delivered',
    cancelled:        'Cancelled',
  }[status] ?? status;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ── Payment info component ────────────────────────────────────────────────────

function PaymentDetail({ order }: { order: Order }) {
  if (!order.paymentStatus) return null;

  if (order.paymentStatus === 'unpaid') {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
        <Banknote size={13} />
        Payment Unpaid
      </div>
    );
  }

  if (order.paymentCollectionMethod === 'mixed') {
    return (
      <div className="mt-2 text-xs bg-green-50 text-green-700 rounded-lg px-3 py-2 space-y-0.5">
        <div className="font-semibold flex items-center gap-1.5">
          <CreditCard size={13} />
          Mixed Payment
        </div>
        <div className="pl-5 text-green-600">Cash ₹{order.cashAmount} · UPI ₹{order.upiAmount}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-2">
      <CreditCard size={13} />
      Paid via {order.paymentCollectionMethod === 'cash' ? 'Cash' : 'UPI'}
    </div>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders', { credentials: 'include' });
      if (res.status === 401) { setOrders([]); setLoading(false); return; }
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // Poll every 5 seconds for real-time status updates
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const { orders, loading, error, refetch } = useOrders();
  const { addToCart, updateQty } = useApp();

  const activeOrders  = orders.filter(o => ACTIVE_STATUSES.has(o.status));
  const historyOrders = orders.filter(o => !ACTIVE_STATUSES.has(o.status));

  const handleCancel = async (orderId: number) => {
    setCancellingId(orderId);
    setConfirmCancelId(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? 'Could not cancel the order. Please try again.');
        return;
      }
      await refetch();
    } finally {
      setCancellingId(null);
    }
  };

  const handleReorder = (order: Order) => {
    order.items.forEach(item => {
      const product: Product = {
        id: item.productId,
        categoryId: '',
        brand: item.brand,
        name: item.name,
        weight: item.weight,
        mrp: item.price,
        price: item.price,
        inStock: true,
      };
      addToCart(product);         // adds 1 to cart
      updateQty(item.productId, item.qty); // set correct qty
    });
  };

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title="My Orders" />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 flex">
        {(['active', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${activeTab === tab ? 'text-primary' : 'text-gray-500'}`}
          >
            {tab === 'active' ? 'Active Orders' : 'Order History'}
            {tab === 'active' && activeOrders.length > 0 && (
              <span className="ml-1.5 bg-primary text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none align-middle">
                {activeOrders.length}
              </span>
            )}
            {activeTab === tab && (
              <motion.div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 size={32} className="animate-spin mb-3" />
            <p className="text-sm">Loading your orders…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <AlertCircle size={32} className="mb-3 text-red-400" />
            <p className="text-sm font-medium text-gray-600">Couldn't load orders</p>
            <button onClick={refetch} className="mt-3 text-primary text-sm font-semibold">Retry</button>
          </div>
        )}

        {/* Active orders tab */}
        {!loading && !error && activeTab === 'active' && (
          <>
            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ShoppingCart size={48} className="mb-4 opacity-30" />
                <p className="text-sm font-medium text-gray-600">No active orders</p>
                <p className="text-xs text-gray-400 mt-1">Your active orders will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map(order => (
                  <ActiveOrderCard
                    key={order.id}
                    order={order}
                    isCancelling={cancellingId === order.id}
                    confirmingCancel={confirmCancelId === order.id}
                    onCancelRequest={() => setConfirmCancelId(order.id)}
                    onCancelConfirm={() => handleCancel(order.id)}
                    onCancelDismiss={() => setConfirmCancelId(null)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* History tab */}
        {!loading && !error && activeTab === 'history' && (
          <>
            {historyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package size={48} className="mb-4 opacity-30" />
                <p className="text-sm font-medium text-gray-600">No past orders</p>
                <p className="text-xs text-gray-400 mt-1">Your completed and cancelled orders will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyOrders.map(order => (
                  <HistoryOrderCard
                    key={order.id}
                    order={order}
                    onReorder={() => handleReorder(order)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </motion.div>
  );
}

// ── Active order card ─────────────────────────────────────────────────────────

function ActiveOrderCard({
  order,
  isCancelling,
  confirmingCancel,
  onCancelRequest,
  onCancelConfirm,
  onCancelDismiss,
}: {
  order: Order;
  isCancelling: boolean;
  confirmingCancel: boolean;
  onCancelRequest: () => void;
  onCancelConfirm: () => void;
  onCancelDismiss: () => void;
}) {
  const stepIdx = currentStepIndex(order.status);
  const canCancel = order.status === 'new' || order.status === 'accepted';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary/5 p-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500 font-medium">ORDER ID</p>
          <p className="font-bold text-gray-900 text-sm">{order.orderNumber}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor(order.status)}`}>
          {statusDisplayLabel(order.status)}
        </span>
      </div>

      {/* Status stepper */}
      <div className="p-5">
        <div className="relative border-l-2 border-gray-200 ml-3 space-y-5 pb-1">
          {ACTIVE_STEPS.map((step, i) => {
            const done    = i < stepIdx;
            const current = i === stepIdx;
            const future  = i > stepIdx;
            return (
              <div key={step.status} className="relative pl-6">
                {done && (
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 size={10} className="text-white" />
                  </div>
                )}
                {current && (
                  <div className="absolute -left-[11px] -top-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                  </div>
                )}
                {future && (
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-gray-200" />
                )}
                <p className={`font-bold text-sm ${current ? 'text-primary' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 space-y-0.5">
        <p className="text-sm font-semibold text-gray-900">
          {order.items.length} item{order.items.length !== 1 ? 's' : ''} · ₹{order.grandTotal}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {order.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
        </p>
        <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
      </div>

      {/* Actions */}
      {canCancel && (
        <div className="p-4 border-t border-gray-100">
          <AnimatePresence mode="wait">
            {confirmingCancel ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <p className="text-sm text-gray-700 font-medium text-center">
                  Are you sure you want to cancel this order?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onCancelDismiss}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 active:bg-gray-50"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={onCancelConfirm}
                    disabled={isCancelling}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-red-600 disabled:opacity-60"
                  >
                    {isCancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Yes, Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="cancel-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCancelRequest}
                disabled={isCancelling}
                className="w-full py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:bg-red-50 disabled:opacity-60"
              >
                <XCircle size={15} />
                Cancel Order
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── History order card ────────────────────────────────────────────────────────

function HistoryOrderCard({ order, onReorder }: { order: Order; onReorder: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const delivered = order.status === 'delivered';
  const cancelled = order.status === 'cancelled';

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${delivered ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            {delivered ? <Package size={20} /> : <XCircle size={20} />}
          </div>
          <div>
            <p className={`font-bold text-sm ${delivered ? 'text-gray-900' : 'text-gray-500'}`}>
              {statusDisplayLabel(order.status)}
            </p>
            <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        <p className="font-bold text-gray-900">₹{order.grandTotal}</p>
      </div>

      {/* Cancellation reason (if admin cancelled) */}
      {cancelled && order.cancellationReason && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-0.5">
            <Clock size={11} />
            Cancellation Reason
          </p>
          <p className="text-xs text-red-700">{order.cancellationReason}</p>
        </div>
      )}

      {/* Payment info (for delivered orders) */}
      {delivered && <PaymentDetail order={order} />}

      {/* Items summary / expanded */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="text-xs text-gray-500 truncate text-left flex items-center gap-1"
      >
        <span className="flex-1 truncate">{order.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</span>
        <ChevronRight size={13} className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-600">
                  <span>{item.qty}× {item.name} <span className="text-gray-400">({item.weight})</span></span>
                  <span>₹{item.price * item.qty}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs font-semibold text-gray-800 pt-1 border-t border-gray-100">
                <span>Grand Total</span>
                <span>₹{order.grandTotal}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center pt-1 border-t border-gray-50">
        <p className="text-xs text-gray-400 font-mono">{order.orderNumber}</p>
        {delivered && (
          <button
            onClick={onReorder}
            className="text-primary text-sm font-semibold flex items-center gap-1.5 active:opacity-70"
          >
            <RotateCcw size={13} />
            Reorder
          </button>
        )}
      </div>
    </div>
  );
}
