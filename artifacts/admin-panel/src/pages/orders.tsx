import { useState, useEffect } from 'react';
import { 
  useListAdminOrders, 
  useUpdateOrderStatus,
  getListAdminOrdersQueryKey,
  useGetAdminOrder,
  getGetAdminOrderQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Loader2, 
  ShoppingBag, 
  MapPin, 
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  CreditCard,
  Banknote,
  AlertCircle,
} from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';

// ── Status helpers ────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ['new', 'accepted', 'packing', 'out_for_delivery'];

const CANCELLATION_REASONS = [
  'Customer did not answer calls',
  'Customer requested cancellation',
  'Delivery address not serviceable',
  'Product out of stock',
  'Customer unavailable at delivery location',
  'Payment issue',
  'Other',
] as const;

const OFD_CANCELLATION_REASONS = [
  'Customer did not answer calls',
  'Customer refused delivery',
  'Wrong address',
  'Payment issue',
  'Other',
] as const;

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const cls = {
    new:              'bg-destructive/10 text-destructive border-destructive/20 animate-pulse',
    accepted:         'bg-blue-500/10 text-blue-600 border-blue-500/20',
    packing:          'bg-orange-500/10 text-orange-600 border-orange-500/20',
    out_for_delivery: 'bg-accent/20 text-accent-foreground border-accent/30',
    delivered:        'bg-primary/10 text-primary border-primary/20',
    cancelled:        'bg-muted text-muted-foreground border-border',
  }[status] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <Badge variant="outline" className={cls}>
      {statusLabel(status)}
    </Badge>
  );
}

// ── Payment display helpers ───────────────────────────────────────────────────

function PaymentInfo({ order }: { order: Record<string, unknown> }) {
  const paymentStatus = order.paymentStatus as string | null;
  const method = order.paymentCollectionMethod as string | null;
  const cashAmount = order.cashAmount as number | null;
  const upiAmount = order.upiAmount as number | null;

  if (!paymentStatus) return null;

  if (paymentStatus === 'unpaid') {
    return (
      <div className="flex items-center gap-2 mt-1 text-sm text-orange-600 font-medium">
        <Banknote className="h-4 w-4" />
        Unpaid
      </div>
    );
  }

  if (method === 'mixed') {
    return (
      <div className="mt-1 text-sm">
        <span className="font-medium text-primary flex items-center gap-1">
          <CreditCard className="h-4 w-4" /> Paid (Mixed)
        </span>
        <div className="text-xs text-muted-foreground mt-0.5 pl-5">
          Cash ₹{cashAmount} · UPI ₹{upiAmount}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1 text-sm text-primary font-medium">
      <CreditCard className="h-4 w-4" />
      Paid via {method === 'cash' ? 'Cash' : 'UPI'}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Orders() {
  const [location, setLocation] = useLocation();
  const [mainTab, setMainTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [activeSubFilter, setActiveSubFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Parse ?id= from URL on mount and location changes
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    setSelectedOrderId(id ? parseInt(id, 10) : null);
  }, [location]);

  // Fetch all orders with 5-second polling for real-time updates
  const { data: allOrders = [], isLoading } = useListAdminOrders({}, {
    query: {
      queryKey: getListAdminOrdersQueryKey(),
      refetchInterval: 5000,
    }
  });

  const activeOrders = allOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = allOrders.filter(o => o.status === 'delivered');
  const cancelledOrders = allOrders.filter(o => o.status === 'cancelled');

  const filteredActive = activeSubFilter === 'all'
    ? activeOrders
    : activeOrders.filter(o => o.status === activeSubFilter);

  const displayOrders =
    mainTab === 'active'    ? filteredActive   :
    mainTab === 'completed' ? completedOrders  :
                              cancelledOrders;

  const openOrder = (id: number) => {
    setSelectedOrderId(id);
    setLocation(`/orders?id=${id}`, { replace: true });
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders</h1>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        {/* ── Main tabs ── */}
        <div className="p-4 border-b border-border shrink-0 space-y-3">
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
            <TabsList className="bg-muted w-full sm:w-auto">
              <TabsTrigger value="active" className="px-4 relative">
                Active Orders
                {activeOrders.length > 0 && (
                  <span className="ml-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                    {activeOrders.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="px-4">
                Completed
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="px-4">
                Cancelled
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* ── Sub-filter (only shown for Active tab) ── */}
          {mainTab === 'active' && (
            <Tabs value={activeSubFilter} onValueChange={setActiveSubFilter}>
              <TabsList className="bg-muted/60 h-auto flex-wrap justify-start">
                <TabsTrigger value="all"              className="px-3 py-1 text-xs">All Active</TabsTrigger>
                <TabsTrigger value="new"              className="px-3 py-1 text-xs">New</TabsTrigger>
                <TabsTrigger value="accepted"         className="px-3 py-1 text-xs">Accepted</TabsTrigger>
                <TabsTrigger value="packing"          className="px-3 py-1 text-xs">Packing</TabsTrigger>
                <TabsTrigger value="out_for_delivery" className="px-3 py-1 text-xs">Out for Delivery</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* ── Order table ── */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm">
                {mainTab === 'active'    ? 'No active orders at the moment.' :
                 mainTab === 'completed' ? 'No delivered orders yet.' :
                                          'No cancelled orders.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Order details</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Customer</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Address</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => openOrder(order.id)}
                  >
                    <td className="px-4 py-4">
                      <div className="font-mono text-xs font-semibold text-primary mb-1">{order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(order.createdAt), 'MMM d, h:mm a')}
                      </div>
                      <div className="mt-1 md:hidden font-medium text-foreground">{order.customerName}</div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="font-medium text-foreground">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        {order.customerMobile}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell max-w-[200px] truncate">
                      <div className="text-xs flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{order.address.houseNumber}, {order.address.area}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-foreground">₹{order.grandTotal}</div>
                      <div className="text-xs text-muted-foreground">{order.paymentMethod.toUpperCase()}</div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <OrderSlideOver
        orderId={selectedOrderId}
        onClose={() => {
          setSelectedOrderId(null);
          setLocation('/orders', { replace: true });
        }}
      />
    </div>
  );
}

// ── Cancel Order Dialog ───────────────────────────────────────────────────────

function CancelOrderDialog({
  open,
  orderId,
  isOutForDelivery,
  onClose,
  onSuccess,
}: {
  open: boolean;
  orderId: number;
  isOutForDelivery?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasons = isOutForDelivery ? OFD_CANCELLATION_REASONS : CANCELLATION_REASONS;

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setCustomReason('');
      setError(null);
      onClose();
    }
  };

  const handleSubmit = async () => {
    const reason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!selectedReason) {
      setError('Please select a cancellation reason.');
      return;
    }
    if (selectedReason === 'Other' && !customReason.trim()) {
      setError('Please enter a reason for cancellation.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason: reason }),
      });
      setSelectedReason('');
      setCustomReason('');
      onSuccess();
    } catch (err: any) {
      // AdminFetchError already fires the unauthorized redirect on 401;
      // for other errors show a local message.
      if (err?.status !== 401) {
        setError(err?.message ?? 'Failed to cancel order. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancel Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* OFD-specific warning */}
          {isOutForDelivery && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-orange-700 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                WARNING!
              </div>
              <p className="text-sm text-orange-700">
                This order is already out for delivery.
              </p>
              <p className="text-sm font-medium text-orange-800">
                Are you sure you want to cancel it?
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {isOutForDelivery ? 'Reason:' : 'Select the reason for cancellation:'}
          </p>

          <div className="space-y-2">
            {reasons.map((reason) => (
              <label
                key={reason}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedReason === reason
                    ? 'border-destructive/50 bg-destructive/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => { setSelectedReason(reason); setError(null); }}
                  className="accent-destructive"
                />
                <span className="text-sm">{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === 'Other' && (
            <div className="space-y-1.5">
              <Label htmlFor="custom-reason" className="text-sm text-muted-foreground">
                Please describe the reason:
              </Label>
              <Input
                id="custom-reason"
                placeholder="Enter custom reason..."
                value={customReason}
                onChange={(e) => { setCustomReason(e.target.value); setError(null); }}
                maxLength={500}
                autoFocus
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {isOutForDelivery ? 'Go Back' : 'Keep Order'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Payment Collection Dialog ─────────────────────────────────────────────────

function PaymentCollectionDialog({
  open,
  orderId,
  grandTotal,
  onClose,
  onSuccess,
}: {
  open: boolean;
  orderId: number;
  grandTotal: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [method, setMethod] = useState<'cash' | 'upi' | 'mixed'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate: updateStatus } = useUpdateOrderStatus();
  const queryClient = useQueryClient();

  const handleClose = () => {
    if (!isSubmitting) {
      setPaymentStatus('paid');
      setMethod('cash');
      setCashAmount('');
      setUpiAmount('');
      setError(null);
      onClose();
    }
  };

  const handleSubmit = () => {
    setError(null);

    if (paymentStatus === 'paid' && method === 'mixed') {
      const cash = Number(cashAmount);
      const upi = Number(upiAmount);
      if (isNaN(cash) || isNaN(upi) || cash < 0 || upi < 0) {
        setError('Please enter valid amounts for Cash and UPI.');
        return;
      }
      if (cash + upi !== grandTotal) {
        setError(`Cash (₹${cash}) + UPI (₹${upi}) must equal the order total (₹${grandTotal}).`);
        return;
      }
    }

    const data: Record<string, unknown> = {
      status: 'delivered',
      paymentStatus,
    };

    if (paymentStatus === 'paid') {
      data.paymentCollectionMethod = method;
      if (method === 'mixed') {
        data.cashAmount = Number(cashAmount);
        data.upiAmount = Number(upiAmount);
      }
    }

    setIsSubmitting(true);
    updateStatus(
      { id: orderId, data: data as any },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetAdminOrderQueryKey(orderId), updated);
          queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
          setPaymentStatus('paid');
          setMethod('cash');
          setCashAmount('');
          setUpiAmount('');
          setError(null);
          onSuccess();
        },
        onError: () => {
          setError('Failed to update order. Please try again.');
          setIsSubmitting(false);
        },
        onSettled: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CreditCard className="h-5 w-5" />
            Payment Collection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Payment status */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Payment Status</p>
            <div className="flex gap-3">
              {(['paid', 'unpaid'] as const).map((s) => (
                <label
                  key={s}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    paymentStatus === s
                      ? s === 'paid'
                        ? 'border-primary/50 bg-primary/5 text-primary'
                        : 'border-orange-500/50 bg-orange-50 text-orange-600'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-status"
                    value={s}
                    checked={paymentStatus === s}
                    onChange={() => { setPaymentStatus(s); setError(null); }}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Payment method (only when paid) */}
          {paymentStatus === 'paid' && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'upi', 'mixed'] as const).map((m) => (
                  <label
                    key={m}
                    className={`flex items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-colors text-sm font-medium ${
                      method === m
                        ? 'border-primary/50 bg-primary/5 text-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={m}
                      checked={method === m}
                      onChange={() => { setMethod(m); setError(null); }}
                      className="sr-only"
                    />
                    {m === 'cash' ? 'Cash' : m === 'upi' ? 'UPI' : 'Mixed'}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Mixed payment amounts */}
          {paymentStatus === 'paid' && method === 'mixed' && (
            <div className="space-y-3 bg-muted/40 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground font-medium">
                Order Total: ₹{grandTotal} — Cash + UPI must equal this amount.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cash-amount" className="text-xs">Cash Amount (₹)</Label>
                  <Input
                    id="cash-amount"
                    type="number"
                    min="0"
                    max={grandTotal}
                    placeholder="0"
                    value={cashAmount}
                    onChange={(e) => {
                      setCashAmount(e.target.value);
                      setError(null);
                      // Auto-fill UPI if cash is a valid number
                      const cash = Number(e.target.value);
                      if (!isNaN(cash) && cash >= 0 && cash <= grandTotal) {
                        setUpiAmount(String(grandTotal - cash));
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="upi-amount" className="text-xs">UPI Amount (₹)</Label>
                  <Input
                    id="upi-amount"
                    type="number"
                    min="0"
                    max={grandTotal}
                    placeholder="0"
                    value={upiAmount}
                    onChange={(e) => {
                      setUpiAmount(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark Delivered
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Order detail slide-over ───────────────────────────────────────────────────

function OrderSlideOver({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useGetAdminOrder(orderId as number, {
    query: {
      queryKey: getGetAdminOrderQueryKey(orderId ?? 0),
      enabled: !!orderId,
      refetchInterval: orderId ? 3000 : false,
    }
  });
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const handleStatusUpdate = (newStatus: string) => {
    if (!orderId) return;
    updateStatus({ id: orderId, data: { status: newStatus } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetAdminOrderQueryKey(orderId), data);
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      }
    });
  };

  const handleCancelSuccess = () => {
    setCancelDialogOpen(false);
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(orderId) });
      queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
  };

  const getStatusButtons = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <>
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isUpdating}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel Order
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => handleStatusUpdate('accepted')} disabled={isUpdating}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Order
            </Button>
          </>
        );
      case 'accepted':
        return (
          <>
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isUpdating}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel Order
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => handleStatusUpdate('packing')} disabled={isUpdating}>
              <Package className="mr-2 h-4 w-4" /> Start Packing
            </Button>
          </>
        );
      case 'packing':
        return (
          <>
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isUpdating}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel Order
            </Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleStatusUpdate('out_for_delivery')} disabled={isUpdating}>
              <Truck className="mr-2 h-4 w-4" /> Out for Delivery
            </Button>
          </>
        );
      case 'out_for_delivery':
        return (
          <>
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isUpdating}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel Order
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => setPaymentDialogOpen(true)} disabled={isUpdating}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Delivered
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  const orderRecord = order as unknown as Record<string, unknown> | undefined;

  return (
    <>
      <Sheet open={!!orderId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto border-l-border bg-card p-0 flex flex-col">
          {isLoading || !order ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <SheetTitle className="text-xl font-bold">Order Details</SheetTitle>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="font-mono text-sm font-bold text-primary">{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {format(new Date(order.createdAt), 'MMMM d, yyyy • h:mm a')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">₹{order.grandTotal}</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">{order.paymentMethod}</div>
                    {orderRecord && <PaymentInfo order={orderRecord} />}
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                {/* Cancellation reason (if cancelled) */}
                {order.status === 'cancelled' && !!orderRecord?.cancellationReason && (
                  <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg">
                    <h4 className="text-xs font-semibold text-destructive uppercase mb-1 flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5" /> Cancellation Reason
                    </h4>
                    <p className="text-sm text-foreground">{orderRecord.cancellationReason as string}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Customer</h4>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" /> {order.customerMobile}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Delivery Address</h4>
                    <div className="text-sm">
                      {order.address.houseNumber}, {order.address.area}
                      {order.address.landmark && <><br/>Near {order.address.landmark}</>}
                      <br/>PIN: {order.address.pincode}
                    </div>
                  </div>
                </div>

                {order.orderNote && (
                  <div className="bg-accent/10 border border-accent/20 p-3 rounded-md">
                    <h4 className="text-xs font-semibold text-accent-foreground uppercase mb-1">Order Note</h4>
                    <p className="text-sm text-foreground">{order.orderNote}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3 border-b border-border pb-2">
                    Order Items ({order.items.length})
                  </h4>
                  <div className="space-y-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-start text-sm">
                        <div className="flex gap-3">
                          <div className="bg-muted rounded text-xs font-bold px-2 py-1 h-fit shrink-0">{item.qty}x</div>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.brand} • {item.weight}</div>
                          </div>
                        </div>
                        <div className="font-medium text-right shrink-0">₹{item.price * item.qty}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3 border-b border-border pb-2">Bill Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₹{order.subtotal}</span>
                    </div>
                    {order.smallCartFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Small Cart Fee</span>
                        <span>₹{order.smallCartFee}</span>
                      </div>
                    )}
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Fee</span>
                        <span>₹{order.deliveryFee}</span>
                      </div>
                    )}
                    {order.handlingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Handling Fee</span>
                        <span>₹{order.handlingFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t border-border border-dashed text-base">
                      <span>Grand Total</span>
                      <span className="text-primary">₹{order.grandTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Payment details section for delivered orders */}
                {order.status === 'delivered' && orderRecord && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3 border-b border-border pb-2">
                      Payment Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Status</span>
                        <span className={`font-semibold ${orderRecord.paymentStatus === 'paid' ? 'text-primary' : 'text-orange-600'}`}>
                          {orderRecord.paymentStatus === 'paid' ? 'Paid' : orderRecord.paymentStatus === 'unpaid' ? 'Unpaid' : '—'}
                        </span>
                      </div>
                      {orderRecord.paymentStatus === 'paid' && !!orderRecord.paymentCollectionMethod && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment Method</span>
                            <span className="font-medium capitalize">
                              {orderRecord.paymentCollectionMethod === 'mixed'
                                ? 'Mixed (Cash + UPI)'
                                : String(orderRecord.paymentCollectionMethod).toUpperCase()}
                            </span>
                          </div>
                          {orderRecord.paymentCollectionMethod === 'mixed' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground pl-4">— Cash</span>
                                <span>₹{Number(orderRecord.cashAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground pl-4">— UPI</span>
                                <span>₹{Number(orderRecord.upiAmount)}</span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border bg-card flex justify-end gap-3 shrink-0">
                {getStatusButtons(order.status)}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Cancel dialog */}
      {orderId && (
        <CancelOrderDialog
          open={cancelDialogOpen}
          orderId={orderId}
          isOutForDelivery={order?.status === 'out_for_delivery'}
          onClose={() => setCancelDialogOpen(false)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Payment collection dialog */}
      {orderId && order && (
        <PaymentCollectionDialog
          open={paymentDialogOpen}
          orderId={orderId}
          grandTotal={order.grandTotal}
          onClose={() => setPaymentDialogOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
