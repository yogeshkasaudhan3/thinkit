import { useMemo, useState } from 'react';
import {
  useGetAdminReportsSummary,
  useGetAdminReportsDailySales,
  useGetAdminReportsTopProducts,
  getGetAdminReportsSummaryQueryKey,
  getGetAdminReportsDailySalesQueryKey,
  getGetAdminReportsTopProductsQueryKey,
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  Trophy,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  startOfMonth,
  subDays,
} from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type PresetKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
];

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function rangeForPreset(preset: PresetKey, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: ymd(now), to: ymd(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: ymd(y), to: ymd(y) };
    }
    case 'week':
      return { from: ymd(startOfWeek(now, { weekStartsOn: 1 })), to: ymd(now) };
    case 'month':
      return { from: ymd(startOfMonth(now)), to: ymd(now) };
    case 'custom':
      return { from: customFrom || ymd(now), to: customTo || ymd(now) };
  }
}

const STATUS_META: { key: 'pending' | 'confirmed' | 'outForDelivery' | 'delivered' | 'cancelled'; label: string; className: string }[] = [
  { key: 'pending', label: 'Pending', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  { key: 'confirmed', label: 'Confirmed', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { key: 'outForDelivery', label: 'Out for Delivery', className: 'bg-accent/20 text-accent-foreground border-accent/30' },
  { key: 'delivered', label: 'Delivered', className: 'bg-primary/10 text-primary border-primary/20' },
  { key: 'cancelled', label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' },
];

export default function Reports() {
  const { toast } = useToast();
  const [preset, setPreset] = useState<PresetKey>('today');
  const [customFrom, setCustomFrom] = useState(ymd(new Date()));
  const [customTo, setCustomTo] = useState(ymd(new Date()));
  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [exporting, setExporting] = useState(false);

  const { from, to } = useMemo(
    () => rangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const summaryParams = { from, to };
  const topProductsParams = { from, to, limit: 8 };

  const { data: summary, isLoading: summaryLoading } = useGetAdminReportsSummary(summaryParams, {
    query: { queryKey: getGetAdminReportsSummaryQueryKey(summaryParams) },
  });

  const { data: dailySales, isLoading: dailyLoading } = useGetAdminReportsDailySales(
    { days: trendDays },
    { query: { queryKey: getGetAdminReportsDailySalesQueryKey({ days: trendDays }) } },
  );

  const { data: topProducts, isLoading: topLoading } = useGetAdminReportsTopProducts(topProductsParams, {
    query: { queryKey: getGetAdminReportsTopProductsQueryKey(topProductsParams) },
  });

  const chartData = useMemo(
    () => (dailySales ?? []).map((d) => ({ ...d, label: format(new Date(`${d.date}T00:00:00`), 'MMM d') })),
    [dailySales],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await fetch(`/api/admin/reports/export?from=${from}&to=${to}`, { credentials: 'include' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error((d as Record<string, string>).error ?? `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thinkit-sales-report-${from}-to-${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports &amp; Analytics</h1>
        <Button onClick={handleExport} disabled={exporting} className="w-full sm:w-auto">
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export CSV
        </Button>
      </div>

      {/* ── Date filter ─────────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:w-56">
            <Select value={preset} onValueChange={(v) => setPreset(v as PresetKey)}>
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {preset === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Label htmlFor="from-date" className="text-xs text-muted-foreground shrink-0">From</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="to-date" className="text-xs text-muted-foreground shrink-0">To</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={ymd(new Date())}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
          )}
          <div className="text-xs text-muted-foreground sm:ml-auto">
            {from === to ? format(new Date(`${from}T00:00:00`), 'MMM d, yyyy') : `${format(new Date(`${from}T00:00:00`), 'MMM d, yyyy')} – ${format(new Date(`${to}T00:00:00`), 'MMM d, yyyy')}`}
          </div>
        </CardContent>
      </Card>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Sales</CardTitle>
            <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center">
              <IndianRupee className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summaryLoading ? '…' : `₹${(summary?.totalSales ?? 0).toLocaleString()}`}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Orders</CardTitle>
            <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summaryLoading ? '…' : summary?.totalOrders ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg. Order Value</CardTitle>
            <div className="h-7 w-7 bg-accent/20 rounded-full flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summaryLoading ? '…' : `₹${(summary?.avgOrderValue ?? 0).toLocaleString()}`}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Delivered</CardTitle>
            <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summaryLoading ? '…' : summary?.deliveredOrders ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cancelled</CardTitle>
            <div className="h-7 w-7 bg-destructive/10 rounded-full flex items-center justify-center">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {summaryLoading ? '…' : summary?.cancelledOrders ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* ── Daily sales trend ─────────────────────────────────────────── */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base font-semibold">Sales Trend</CardTitle>
            <Tabs value={String(trendDays)} onValueChange={(v) => setTrendDays(v === '30' ? 30 : 7)}>
              <TabsList>
                <TabsTrigger value="7">7 Days</TabsTrigger>
                <TabsTrigger value="30">30 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={trendDays === 30 ? 3 : 0} padding={{ left: 8, right: 8 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip
                      formatter={(value: number, name: string) => [name === 'sales' ? `₹${value.toLocaleString()}` : value, name === 'sales' ? 'Sales' : 'Orders']}
                    />
                    <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Order status breakdown ───────────────────────────────────── */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summaryLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              STATUS_META.map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <Badge variant="outline" className={s.className}>{s.label}</Badge>
                  <span className="font-semibold text-foreground">{summary?.statusBreakdown?.[s.key] ?? 0}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top selling products ────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Trophy className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-y border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-right">Qty Sold</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : !topProducts || topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No sales in this period.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, i) => (
                    <tr key={`${p.productId ?? p.name}-${i}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.brand}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{p.qtySold}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{p.revenue.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
