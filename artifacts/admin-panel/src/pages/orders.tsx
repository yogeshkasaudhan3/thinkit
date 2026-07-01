import { useState, useMemo, useEffect } from 'react';
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
  Search, 
  Filter, 
  Loader2, 
  ShoppingBag, 
  MapPin, 
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { useLocation } from 'wouter';

export default function Orders() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialId = searchParams.get('id');
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(initialId ? parseInt(initialId, 10) : null);
  
  // When search params change, update selected order
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) setSelectedOrderId(parseInt(id, 10));
  }, [location]);

  const { data: orders = [], isLoading } = useListAdminOrders(
    statusFilter !== 'all' ? { status: statusFilter } : {}
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders</h1>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-border shrink-0 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
            <TabsList className="bg-muted w-full sm:w-auto h-auto flex-wrap justify-start">
              <TabsTrigger value="all" className="px-3 py-1.5 text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="new" className="px-3 py-1.5 text-xs sm:text-sm">New</TabsTrigger>
              <TabsTrigger value="accepted" className="px-3 py-1.5 text-xs sm:text-sm">Accepted</TabsTrigger>
              <TabsTrigger value="packing" className="px-3 py-1.5 text-xs sm:text-sm">Packing</TabsTrigger>
              <TabsTrigger value="out_for_delivery" className="px-3 py-1.5 text-xs sm:text-sm">Out for Delivery</TabsTrigger>
              <TabsTrigger value="delivered" className="px-3 py-1.5 text-xs sm:text-sm">Delivered</TabsTrigger>
              <TabsTrigger value="cancelled" className="px-3 py-1.5 text-xs sm:text-sm">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm">There are no orders matching your current filter.</p>
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
                {orders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-muted/30 cursor-pointer transition-colors group"
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setLocation(`/orders?id=${order.id}`, { replace: true });
                    }}
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
                      <Badge variant="outline" className={`
                        ${order.status === 'new' ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' : ''}
                        ${order.status === 'accepted' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''}
                        ${order.status === 'packing' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : ''}
                        ${order.status === 'out_for_delivery' ? 'bg-accent/20 text-accent-foreground border-accent/30' : ''}
                        ${order.status === 'delivered' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                        ${order.status === 'cancelled' ? 'bg-muted text-muted-foreground border-border' : ''}
                      `}>
                        {order.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
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

function OrderSlideOver({ orderId, onClose }: { orderId: number | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useGetAdminOrder(orderId as number, {
    query: { queryKey: getGetAdminOrderQueryKey(orderId ?? 0), enabled: !!orderId }
  });
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus();

  const handleStatusUpdate = (newStatus: string) => {
    if (!orderId) return;
    updateStatus({ id: orderId, data: { status: newStatus } }, {
      onSuccess: (data) => {
        // Update detail cache
        queryClient.setQueryData(['/api/admin/orders', orderId], data);
        // Invalidate list
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      }
    });
  };

  const getStatusButtons = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <>
            <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-white" onClick={() => handleStatusUpdate('cancelled')} disabled={isUpdating}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel Order
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => handleStatusUpdate('accepted')} disabled={isUpdating}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Order
            </Button>
          </>
        );
      case 'accepted':
        return (
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => handleStatusUpdate('packing')} disabled={isUpdating}>
            <Package className="mr-2 h-4 w-4" /> Start Packing
          </Button>
        );
      case 'packing':
        return (
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleStatusUpdate('out_for_delivery')} disabled={isUpdating}>
            <Truck className="mr-2 h-4 w-4" /> Out for Delivery
          </Button>
        );
      case 'out_for_delivery':
        return (
          <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => handleStatusUpdate('delivered')} disabled={isUpdating}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Delivered
          </Button>
        );
      default:
        return null;
    }
  };

  return (
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
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  Order Details
                </SheetTitle>
                <Badge variant="outline" className={`
                  text-sm px-3 py-1
                  ${order.status === 'new' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                  ${order.status === 'accepted' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''}
                  ${order.status === 'packing' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : ''}
                  ${order.status === 'out_for_delivery' ? 'bg-accent/20 text-accent-foreground border-accent/30' : ''}
                  ${order.status === 'delivered' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                  ${order.status === 'cancelled' ? 'bg-muted text-muted-foreground border-border' : ''}
                `}>
                  {order.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
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
                </div>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-8">
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
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3 border-b border-border pb-2">Order Items ({order.items.length})</h4>
                <div className="space-y-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-start text-sm">
                      <div className="flex gap-3">
                        <div className="bg-muted rounded text-xs font-bold px-2 py-1 h-fit shrink-0">
                          {item.qty}x
                        </div>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.brand} • {item.weight}</div>
                        </div>
                      </div>
                      <div className="font-medium text-right shrink-0">
                        ₹{item.price * item.qty}
                      </div>
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
            </div>

            <div className="p-4 border-t border-border bg-card flex justify-end gap-3 shrink-0">
              {getStatusButtons(order.status)}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
