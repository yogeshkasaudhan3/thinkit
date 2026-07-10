import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearch } from 'wouter';
import {
  Search, Plus, Upload, Loader2, Package, Pencil, MoreVertical,
  X, ChevronLeft, ChevronRight, Zap, TrendingDown, Sparkles, CheckCircle2, AlertCircle,
  Tag, CheckSquare, AlertTriangle,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import type { AdminProduct } from '@workspace/api-client-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const SORT_OPTIONS = [
  { value: 'name-asc',   label: 'Name A–Z' },
  { value: 'name-desc',  label: 'Name Z–A' },
  { value: 'price-asc',  label: 'Price Low–High' },
  { value: 'price-desc', label: 'Price High–Low' },
  { value: 'recent',     label: 'Recently Added' },
];

// Keys used in sessionStorage for state persistence across navigations
const SS_RETURN_URL  = 'products-return-url';
const SS_SCROLL_Y    = 'products-scroll-y';

// ── API helpers ───────────────────────────────────────────────────────────────

async function adminFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: 'include', ...options });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error((d as Record<string, string>).error ?? `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}

function buildQS(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== 'all') q.set(k, String(v));
  }
  return q.toString();
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useCategories() {
  return useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/admin/categories'],
    queryFn: () => adminFetch('/api/admin/categories'),
    staleTime: 5 * 60_000,
  });
}

function useSubcategoryOptions(categoryId: string) {
  return useQuery<string[]>({
    queryKey: ['/api/admin/categories', categoryId, 'subcategories'],
    queryFn: () =>
      adminFetch<Array<{ name: string } | string>>(`/api/admin/categories/${categoryId}/subcategories`)
        .then((data) => data.map((d) => (typeof d === 'string' ? d : d.name))),
    enabled: !!categoryId,
    staleTime: 2 * 60_000,
  });
}

interface ProductStats { total: number; inStock: number; outOfStock: number; noSubcategory: number; orphanSubcategory: number; }

function useProductStats(qs: string) {
  return useQuery<ProductStats>({
    queryKey: ['/api/admin/products', 'stats', qs],
    queryFn: () => adminFetch(`/api/admin/products/stats?${qs}`),
    staleTime: 30_000,
  });
}

function useProductList(qs: string) {
  return useQuery<AdminProduct[]>({
    queryKey: ['/api/admin/products', 'list', qs],
    queryFn: () => adminFetch(`/api/admin/products?${qs}`),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ── Quick Edit Dialog ─────────────────────────────────────────────────────────

function QuickEditDialog({
  product, open, onClose, onSaved,
}: {
  product: AdminProduct | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [price, setPrice]       = useState('');
  const [stockQty, setStockQty] = useState('');
  const [inStock, setInStock]   = useState(true);
  const [enabled, setEnabled]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (product) {
      setPrice(String(product.price));
      setStockQty(String(product.stockQty));
      setInStock(product.inStock);
      setEnabled(product.enabled);
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    try {
      await adminFetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(price), stockQty: Number(stockQty), inStock, enabled }),
      });
      toast({ title: 'Product updated' });
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{product?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stock Quantity</Label>
              <Input type="number" min="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">In Stock</p>
              <p className="text-xs text-muted-foreground">Customers can order</p>
            </div>
            <Switch checked={inStock} onCheckedChange={setInStock} className="data-[state=checked]:bg-primary" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Visible in the store</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} className="data-[state=checked]:bg-primary" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Products() {
  const [, setLocation] = useLocation();
  const rawSearch       = useSearch(); // e.g. "page=3&q=atta&cat=5"
  const queryClient     = useQueryClient();
  const { toast }       = useToast();

  // Keep a ref to the latest search string so updateUrl callbacks don't
  // need search in their dependency arrays (avoids stale-closure issues).
  const searchRef = useRef(rawSearch);
  useEffect(() => { searchRef.current = rawSearch; }, [rawSearch]);

  // Track the last debounced value we wrote to the URL so we can distinguish
  // "URL changed because WE wrote it" from "URL changed externally" (back/fwd).
  const lastWrittenQRef = useRef(new URLSearchParams(rawSearch).get('q') || '');

  // ── Parse URL params (URL is the single source of truth for filter state) ──
  const urlParams = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);

  const page           = Math.max(1, parseInt(urlParams.get('page')  || '1', 10) || 1);
  const categoryFilter = urlParams.get('cat')   || '';
  const subcatFilter   = urlParams.get('sub')   || '';
  const stockFilter    = (urlParams.get('stock') as 'all' | 'in' | 'out') || 'all';
  const noSubcatFilter = urlParams.get('nosub') === '1';
  const orphanFilter   = urlParams.get('orphan') === '1';
  const sort           = urlParams.get('sort')  || 'name-asc';

  // Search term has its own local state for the input (debounce before hitting URL)
  const [searchTerm, setSearchTerm] = useState(() => urlParams.get('q') || '');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ── URL updater ───────────────────────────────────────────────────────────

  const updateUrl = useCallback(
    (updates: Record<string, string | number | boolean | undefined>) => {
      const p = new URLSearchParams(searchRef.current);
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === '' || v === 'all') p.delete(k);
        else p.set(k, String(v));
      }
      const qs = p.toString();
      const next = '/products' + (qs ? '?' + qs : '');
      const cur  = '/products' + (searchRef.current ? '?' + searchRef.current : '');
      // Skip navigation when nothing changed (avoids spurious history entries)
      if (next !== cur) setLocation(next, { replace: true });
    },
    [setLocation],
  );

  // Sync debounced search → URL (only when the value actually changed)
  const prevDebouncedRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevDebouncedRef.current === debouncedSearch) return;
    prevDebouncedRef.current = debouncedSearch;
    lastWrittenQRef.current = debouncedSearch;
    updateUrl({ q: debouncedSearch || undefined, page: undefined });
  }, [debouncedSearch, updateUrl]);

  // Sync URL → search input when URL changes externally (browser back/forward).
  // We skip if the change was caused by our own debounced write (lastWrittenQRef).
  useEffect(() => {
    const qFromUrl = new URLSearchParams(rawSearch).get('q') || '';
    if (qFromUrl !== lastWrittenQRef.current) {
      setSearchTerm(qFromUrl);
    }
  }, [rawSearch]);

  // ── Bulk selection state ──────────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [bulkAssignOpen, setBulkAssignOpen]   = useState(false);
  const [bulkAssignSubcat, setBulkAssignSubcat] = useState('');
  const [bulkAssigning, setBulkAssigning]     = useState(false);

  // ── Bulk image optimization ───────────────────────────────────────────────

  const [bulkOptOpen, setBulkOptOpen]   = useState(false);
  const [bulkOptRunning, setBulkOptRunning] = useState(false);
  const [bulkOptResult, setBulkOptResult] = useState<{
    batchSize: number; lastProcessedId: number; remaining: number;
    processed: number; skipped: number; failed: number;
    errors: string[]; done: boolean;
  } | null>(null);
  // Cumulative totals across multiple "Run Again" calls
  const [bulkOptTotals, setBulkOptTotals] = useState({ processed: 0, skipped: 0, failed: 0 });

  const runBulkOptimize = useCallback(async (afterId = 0, isFirstRun = true) => {
    setBulkOptRunning(true);
    if (isFirstRun) setBulkOptResult(null);
    try {
      type BulkResult = typeof bulkOptResult;
      const data = await adminFetch<NonNullable<BulkResult>>('/api/admin/products/bulk-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ afterId }),
      });
      setBulkOptResult(data);
      setBulkOptTotals(prev => isFirstRun
        ? { processed: data.processed, skipped: data.skipped, failed: data.failed }
        : { processed: prev.processed + data.processed, skipped: prev.skipped + data.skipped, failed: prev.failed + data.failed }
      );
    } catch {
      toast({ title: 'Bulk optimization failed', variant: 'destructive' });
    } finally {
      setBulkOptRunning(false);
    }
  }, [toast]);

  // ── Quick edit ────────────────────────────────────────────────────────────

  const [quickEditProduct, setQuickEditProduct] = useState<AdminProduct | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: categories = [] } = useCategories();
  const { data: subcatOptions = [] } = useSubcategoryOptions(categoryFilter);

  const baseFilters = {
    q:                  debouncedSearch  || undefined,
    category:           categoryFilter   || undefined,
    subcategory:        subcatFilter     || undefined,
    inStock:            stockFilter === 'in' ? true : stockFilter === 'out' ? false : undefined,
    noSubcategory:      noSubcatFilter   || undefined,
    subcategoryOrphan:  orphanFilter     || undefined,
  };

  // Stats strip inStock, noSubcategory, and orphan so we always get the full bucket counts
  const statsQS = buildQS({ ...baseFilters, inStock: undefined, noSubcategory: undefined, subcategoryOrphan: undefined });
  const listQS  = buildQS({ ...baseFilters, sort, page, pageSize: PAGE_SIZE });

  const { data: stats }                        = useProductStats(statsQS);
  const { data: products = [], isLoading }     = useProductList(listQS);

  // Clear selection whenever the product list query changes (filter/page changed)
  useEffect(() => { setSelectedIds(new Set()); }, [listQS]);

  // Pagination — totalFiltered respects the active filter for correct page count
  const totalFiltered = stats
    ? orphanFilter          ? (stats.orphanSubcategory ?? 0)
    : noSubcatFilter        ? (stats.noSubcategory ?? 0)
    : stockFilter === 'in'  ? stats.inStock
    : stockFilter === 'out' ? stats.outOfStock
    : stats.total
    : 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const hasFilters = !!(debouncedSearch || categoryFilter || subcatFilter || stockFilter !== 'all' || noSubcatFilter || orphanFilter);

  // ── Scroll position restoration ───────────────────────────────────────────

  const hasData = products.length > 0 || (!isLoading && stats !== undefined);
  const scrollRestored = useRef(false);

  useEffect(() => {
    if (!hasData || scrollRestored.current) return;
    const saved = sessionStorage.getItem(SS_SCROLL_Y);
    if (!saved) return;
    const targetY = parseInt(saved, 10);
    if (!Number.isFinite(targetY)) return;
    scrollRestored.current = true;
    sessionStorage.removeItem(SS_SCROLL_Y);
    // Double RAF ensures table rows are in DOM before scrolling.
    // Clamp to actual document height so we never scroll into empty space.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: Math.min(targetY, maxY), behavior: 'instant' });
      });
    });
  }, [hasData]);

  // ── Filter helpers ────────────────────────────────────────────────────────

  const setCategoryFilter = (v: string) =>
    updateUrl({ cat: v || undefined, sub: undefined, page: undefined });
  const setSubcatFilter = (v: string) =>
    updateUrl({ sub: v || undefined, page: undefined });
  const setStockFilter = (v: string) =>
    updateUrl({ stock: v === 'all' ? undefined : v, page: undefined });
  const setNoSubcatFilter = (v: boolean) =>
    updateUrl({ nosub: v ? '1' : undefined, page: undefined });
  const setOrphanFilter = (v: boolean) =>
    updateUrl({ orphan: v ? '1' : undefined, page: undefined });
  const setSort = (v: string) =>
    updateUrl({ sort: v === 'name-asc' ? undefined : v, page: undefined });
  const setPage = (p: number) =>
    updateUrl({ page: p === 1 ? undefined : p });

  const clearFilters = () => {
    setSearchTerm('');
    setLocation('/products', { replace: true });
  };

  // ── Bulk selection helpers ────────────────────────────────────────────────

  const allPageIds = products.map((p) => p.id);
  const allOnPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = !allOnPageSelected && allPageIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (allOnPageSelected) { allPageIds.forEach((id) => s.delete(id)); }
      else                   { allPageIds.forEach((id) => s.add(id));    }
      return s;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignSubcat.trim() || selectedIds.size === 0) return;
    setBulkAssigning(true);
    try {
      await adminFetch('/api/admin/products/bulk-subcategory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), subcategory: bulkAssignSubcat }),
      });
      toast({ title: `Subcategory assigned to ${selectedIds.size} product(s)` });
      setSelectedIds(new Set());
      setBulkAssignOpen(false);
      setBulkAssignSubcat('');
      invalidateAll();
    } catch (err: unknown) {
      toast({
        title: 'Failed to assign subcategory',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBulkAssigning(false);
    }
  };

  // ── Navigation helpers ────────────────────────────────────────────────────

  const navigateToEdit = (id: number) => {
    // Save the full products URL and current scroll position so we can return
    const returnUrl = '/products' + (rawSearch ? '?' + rawSearch : '');
    sessionStorage.setItem(SS_RETURN_URL,  returnUrl);
    sessionStorage.setItem(SS_SCROLL_Y,    String(window.scrollY));
    setLocation(`/products/${id}/edit`);
  };

  // ── Cache invalidation ────────────────────────────────────────────────────

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
  }, [queryClient]);

  const handleStockToggle = async (id: number, inStock: boolean) => {
    try {
      await adminFetch(`/api/admin/products/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock }),
      });
      invalidateAll();
    } catch {
      toast({ title: 'Failed to update stock status', variant: 'destructive' });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Products</h1>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Button variant="outline" onClick={() => { setBulkOptOpen(true); setBulkOptResult(null); }} className="flex-1 sm:flex-none">
            <Sparkles className="mr-2 h-4 w-4" /> Optimize Images
          </Button>
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href="/products/bulk"><Upload className="mr-2 h-4 w-4" /> Bulk Import</Link>
          </Button>
          <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
            <Link href="/products/new"><Plus className="mr-2 h-4 w-4" /> Add Product</Link>
          </Button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {stats ? stats.total.toLocaleString() : <span className="text-muted-foreground text-lg">…</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 font-medium">Total Products</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-primary tabular-nums">
            {stats ? stats.inStock.toLocaleString() : <span className="text-muted-foreground text-lg">…</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 font-medium">In Stock</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-destructive tabular-nums">
            {stats ? stats.outOfStock.toLocaleString() : <span className="text-muted-foreground text-lg">…</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center justify-center gap-1">
            <TrendingDown className="h-3 w-3" /> Out of Stock
          </div>
        </div>
        {/* No Subcategory — clickable to toggle the filter */}
        <button
          type="button"
          onClick={() => setNoSubcatFilter(!noSubcatFilter)}
          className={`rounded-xl p-4 text-center shadow-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            noSubcatFilter
              ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
              : 'bg-card border-border hover:bg-muted/50'
          }`}
        >
          <div className={`text-2xl font-bold tabular-nums ${noSubcatFilter ? 'text-amber-700' : 'text-amber-600'}`}>
            {stats ? (stats.noSubcategory ?? 0).toLocaleString() : <span className="text-muted-foreground text-lg">…</span>}
          </div>
          <div className={`text-xs mt-0.5 font-medium flex items-center justify-center gap-1 ${noSubcatFilter ? 'text-amber-700' : 'text-muted-foreground'}`}>
            <Tag className="h-3 w-3" /> No Subcategory
            {noSubcatFilter && <span className="ml-1 text-[10px] bg-amber-200 text-amber-800 rounded px-1">filtered</span>}
          </div>
        </button>

        {/* Ghost Subcategory — has a subcategory not in the master list */}
        <button
          type="button"
          onClick={() => setOrphanFilter(!orphanFilter)}
          className={`rounded-xl p-4 text-center shadow-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring col-span-2 sm:col-span-1 ${
            orphanFilter
              ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-300'
              : (stats?.orphanSubcategory ?? 0) > 0
                ? 'bg-card border-orange-200 hover:bg-orange-50/60'
                : 'bg-card border-border hover:bg-muted/50'
          }`}
        >
          <div className={`text-2xl font-bold tabular-nums ${orphanFilter ? 'text-orange-700' : (stats?.orphanSubcategory ?? 0) > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
            {stats ? (stats.orphanSubcategory ?? 0).toLocaleString() : <span className="text-muted-foreground text-lg">…</span>}
          </div>
          <div className={`text-xs mt-0.5 font-medium flex items-center justify-center gap-1 ${orphanFilter ? 'text-orange-700' : (stats?.orphanSubcategory ?? 0) > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
            <AlertTriangle className="h-3 w-3" /> Ghost Subcategory
            {orphanFilter && <span className="ml-1 text-[10px] bg-orange-200 text-orange-800 rounded px-1">filtered</span>}
          </div>
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2.5 items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name, brand, SKU…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
            />
          </div>

          {/* Category */}
          <Select
            value={categoryFilter || '__all__'}
            onValueChange={(v) => setCategoryFilter(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subcategory — only visible when category is selected and options exist */}
          {categoryFilter && subcatOptions.length > 0 && (
            <Select
              value={subcatFilter || '__all__'}
              onValueChange={(v) => setSubcatFilter(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Subcats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Subcategories</SelectItem>
                {subcatOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Stock filter */}
          <Select value={stockFilter} onValueChange={(v) => setStockFilter(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in">In Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sort} onValueChange={(v) => setSort(v)}>
            <SelectTrigger className="w-[155px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasFilters && (
            <Button
              variant="ghost" size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Product table ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
            {hasFilters && (
              <Button variant="link" className="mt-2 text-primary" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
                <tr>
                  {(noSubcatFilter || orphanFilter) && (
                    <th className="px-4 py-3 font-medium w-10">
                      <Checkbox
                        checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all on page"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 font-medium w-12"></th>
                  <th className="px-4 py-3 font-medium">Product Details</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-center">In Stock</th>
                  <th className="px-4 py-3 font-medium text-center hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 font-medium text-right w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    id={`product-${product.id}`}
                    className={`hover:bg-muted/30 transition-colors ${!product.enabled ? 'opacity-60' : ''} ${selectedIds.has(product.id) ? 'bg-amber-50/50' : ''}`}
                  >
                    {/* Checkbox (when no-subcat or orphan filter is active) */}
                    {(noSubcatFilter || orphanFilter) && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                          aria-label={`Select ${product.name}`}
                        />
                      </td>
                    )}
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 rounded-md bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                        {product.imageUrl
                          ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          : <Package className="h-5 w-5 text-muted-foreground/50" />}
                      </div>
                    </td>

                    {/* Product details */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground truncate max-w-[180px] md:max-w-xs" title={product.name}>
                        {product.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{product.brand} • {product.weight}</div>
                      {product.sku && (
                        <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">SKU: {product.sku}</div>
                      )}
                      <div className="flex gap-1 mt-1.5 md:hidden">
                        {product.isBestSeller    && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-accent/20 text-accent-foreground border-transparent">Best Seller</Badge>}
                        {product.isDwarikaSpecial && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-primary/10 text-primary border-transparent">Special</Badge>}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm font-medium">{product.categoryId.split(':')[1]?.trim() || product.categoryId}</div>
                      {product.subcategory && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">{product.subcategory}</span>
                          {orphanFilter && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1 py-0 rounded bg-orange-100 text-orange-700 border border-orange-200">
                              <AlertTriangle className="h-2.5 w-2.5" /> Ghost
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-1 mt-1.5">
                        {product.isBestSeller    && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-accent/20 text-accent-foreground border-transparent">Best Seller</Badge>}
                        {product.isDwarikaSpecial && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-transparent">Special</Badge>}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-foreground">₹{product.price}</div>
                      {product.mrp > product.price && (
                        <div className="text-xs text-muted-foreground line-through">₹{product.mrp}</div>
                      )}
                    </td>

                    {/* In Stock toggle */}
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={product.inStock}
                        onCheckedChange={(checked) => handleStockToggle(product.id, checked)}
                        className="data-[state=checked]:bg-primary"
                      />
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {product.enabled
                        ? <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Active</Badge>
                        : <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Disabled</Badge>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setQuickEditProduct(product)}>
                            <Zap className="mr-2 h-4 w-4" /> Quick Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigateToEdit(product.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {totalFiltered > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 shrink-0">
            <div className="text-sm text-muted-foreground">
              Page{' '}
              <span className="font-medium text-foreground">{page}</span>
              {' '}of{' '}
              <span className="font-medium text-foreground">{totalPages.toLocaleString()}</span>
              {' '}·{' '}
              <span className="font-medium text-foreground">{totalFiltered.toLocaleString()}</span> products
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk action bar (shown when products are selected) ─────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-xl shadow-xl px-5 py-3">
          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => { setBulkAssignSubcat(''); setBulkAssignOpen(true); }}
          >
            <Tag className="mr-2 h-3.5 w-3.5" /> Assign Subcategory
          </Button>
          <Button
            size="sm" variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── Bulk Assign Subcategory Dialog ─────────────────────────────────── */}
      <Dialog open={bulkAssignOpen} onOpenChange={(v) => !v && setBulkAssignOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" /> Assign Subcategory
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Choose a subcategory to assign to{' '}
              <strong>{selectedIds.size} selected product{selectedIds.size !== 1 ? 's' : ''}</strong>.
            </p>
            {/* If a category filter is active and there are known subcats, show a dropdown; otherwise free text */}
            {categoryFilter && subcatOptions.length > 0 ? (
              <div className="space-y-1.5">
                <Label>Subcategory</Label>
                <Select value={bulkAssignSubcat} onValueChange={setBulkAssignSubcat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a subcategory…" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcatOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Subcategory name</Label>
                <Input
                  placeholder="e.g. Basmati Rice"
                  value={bulkAssignSubcat}
                  onChange={(e) => setBulkAssignSubcat(e.target.value)}
                  autoFocus
                />
                {!categoryFilter && (
                  <p className="text-xs text-muted-foreground">
                    Tip: filter by category first to pick from existing subcategories.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignOpen(false)} disabled={bulkAssigning}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssigning || !bulkAssignSubcat.trim()}
              className="min-w-[110px]"
            >
              {bulkAssigning
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                : <><Tag className="mr-2 h-4 w-4" /> Assign</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick Edit Dialog ──────────────────────────────────────────────── */}
      <QuickEditDialog
        product={quickEditProduct}
        open={!!quickEditProduct}
        onClose={() => setQuickEditProduct(null)}
        onSaved={invalidateAll}
      />

      {/* ── Bulk Image Optimize Dialog ─────────────────────────────────────── */}
      <Dialog open={bulkOptOpen} onOpenChange={setBulkOptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Bulk Optimize Images
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!bulkOptResult && !bulkOptRunning && (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>This will process up to <strong>100 product images</strong> per run:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Resize to ≤ 600 × 600 px</li>
                  <li>Convert to WebP at quality 85</li>
                  <li>Strip EXIF / GPS metadata</li>
                </ul>
                <p className="text-xs">Already-optimised images are skipped automatically. Run again if more than 100 need processing.</p>
              </div>
            )}

            {bulkOptRunning && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing images… this may take a minute.</p>
              </div>
            )}

            {bulkOptResult && (
              <div className="space-y-3">
                {/* Cumulative totals across all runs */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{bulkOptTotals.processed}</div>
                    <div className="text-xs text-emerald-600 font-medium mt-0.5">Optimised</div>
                  </div>
                  <div className="bg-muted border border-border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{bulkOptTotals.skipped}</div>
                    <div className="text-xs text-muted-foreground font-medium mt-0.5">Already OK</div>
                  </div>
                  {bulkOptTotals.failed > 0 && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-center col-span-2">
                      <div className="text-2xl font-bold text-destructive">{bulkOptTotals.failed}</div>
                      <div className="text-xs text-destructive/80 font-medium mt-0.5">Failed</div>
                    </div>
                  )}
                </div>

                {!bulkOptResult.done && bulkOptResult.remaining > 0 && (
                  <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>{bulkOptResult.remaining}</strong> more images remaining — click Continue.</span>
                  </div>
                )}

                {bulkOptResult.done && bulkOptTotals.failed === 0 && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>All product images are now optimised!</span>
                  </div>
                )}

                {bulkOptResult.errors.length > 0 && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">Show errors ({bulkOptResult.errors.length})</summary>
                    <ul className="mt-2 space-y-1 list-disc list-inside ml-1">
                      {bulkOptResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkOptOpen(false)} disabled={bulkOptRunning}>Close</Button>
            {(!bulkOptResult || !bulkOptResult.done) && (
              <Button
                onClick={() => {
                  const afterId = bulkOptResult?.lastProcessedId ?? 0;
                  const isFirst = !bulkOptResult;
                  runBulkOptimize(afterId, isFirst);
                }}
                disabled={bulkOptRunning}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {bulkOptRunning
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
                  : bulkOptResult
                    ? <><Sparkles className="mr-2 h-4 w-4" /> Continue ({bulkOptResult.remaining} left)</>
                    : <><Sparkles className="mr-2 h-4 w-4" /> Start Optimization</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
