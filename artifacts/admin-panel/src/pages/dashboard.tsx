import { useGetAdminDashboard } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, DollarSign, Clock, Truck, Loader2, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: stats, isLoading } = useGetAdminDashboard();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <div className="text-sm text-muted-foreground font-medium">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Sales</CardTitle>
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{stats.todaySales.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Orders</CardTitle>
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.todayOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            <div className="h-8 w-8 bg-destructive/10 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out for Delivery</CardTitle>
            <div className="h-8 w-8 bg-accent/20 rounded-full flex items-center justify-center">
              <Truck className="h-4 w-4 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.outForDelivery}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10" asChild>
              <Link href="/orders">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-y border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No recent orders.
                      </td>
                    </tr>
                  ) : (
                    stats.recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                        <td className="px-4 py-3 font-medium">{order.customerName}</td>
                        <td className="px-4 py-3">₹{order.grandTotal}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`
                            ${order.status === 'new' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                            ${order.status === 'accepted' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''}
                            ${order.status === 'packing' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : ''}
                            ${order.status === 'out_for_delivery' ? 'bg-accent/20 text-accent-foreground border-accent/30' : ''}
                            ${order.status === 'delivered' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                            ${order.status === 'cancelled' ? 'bg-muted text-muted-foreground border-border' : ''}
                          `}>
                            {order.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setLocation(`/orders?id=${order.id}`)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Store Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. Delivery Time</span>
                <span className="font-bold">{stats.avgDeliveryMinutes} mins</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${Math.min(100, Math.max(10, (60 - stats.avgDeliveryMinutes) * 2))}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">Target: &lt; 30 mins</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
