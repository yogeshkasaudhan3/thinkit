import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  Search, Plus, Upload, Loader2, Package, Pencil, MoreVertical,
  X, ChevronLeft, ChevronRight, Zap, TrendingDown,
} from 'lucide-react';
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
import { adminFetch } from '@/lib/admin-fetch';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const SORT_OPTIONS = [
  { value: 'name-asc',   label: 'Name A–Z' },
  { value: 'name-desc',  label: 'Name Z–A' },
  { value: 'price-asc',  label: 'Price Low–High' },
  { value: 'price-desc', label: 'Price High–Low' },
  { value: 'recent',     label: 'Recently Added' },
];

// ── API helpers ───────────────────────────────────────────────────────────────

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

interface ProductStats { total: number; inStock: number; outOfStock: number; }

function useProductStats(qs: string) {
  return useQuery<ProductStats>({
    // Key must share prefix '/api/admin/products' so invalidateQueries({ queryKey: ['/api/admin/products'] }) catches it
    queryKey: ['/api/admin/products', 'stats', qs],
    queryFn: () => adminFetch(`/api/admin/products/stats?${qs}`),
    staleTime: 30_000,
  });
}

function useProductList(qs: string) {
  return useQuery<AdminProduct[]>({
    // Same prefix for shared invalidation
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
      toast({ title: 'Failed to save', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
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
  const queryClient     = useQueryClient();
  const { toast }       = useToast();

  // Filters
  const [searchTerm,       setSearchTerm]       = useState('');
  const [categoryFilter,   setCategoryFilter]   = useState('');
  const [subcatFilter,     setSubcatFilter]     = useState('');
  const [stockFilter,      setStockFilter]      = useState<'all' | 'in' | 'out'>('all');
  const [sort,             setSort]             = useState('name-asc');
  const [page,             setPage]             = useState(1);
  const [quickEditProduct, setQuickEditProduct] = useState<AdminProduct | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const resetPage = () => setPage(1);

  // Data
  const { data: categories = [] } = useCategories();
  const { data: subcatOptions = [] } = useSubcategoryOptions(categoryFilter);

  const baseFilters = {
    q:           debouncedSearch  || undefined,
    category:    categoryFilter   || undefined,
    subcategory: subcatFilter     || undefined,
    inStock:     stockFilter === 'in' ? true : stockFilter === 'out' ? false : undefined,
  };

  const statsQS = buildQS({ ...baseFilters, inStock: undefined }); // stats always shows both
  const listQS  = buildQS({ ...baseFilters, sort, page, pageSize: PAGE_SIZE });

  const { data: stats }              = useProductStats(statsQS);
  const { data: products = [], isLoading } = useProductList(listQS);

  // Derive the filtered total for pagination from stats bucket counts so that
  // when stockFilter is 'in' or 'out' the page count matches the actual list size.
  const totalFiltered = stats
    ? stockFilter === 'in'  ? stats.inStock
    : stockFilter === 'out' ? stats.outOfStock
    : stats.total
    : 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const hasFilters = !!(debouncedSearch || categoryFilter || subcatFilter || stockFilter !== 'all');

  const clearFilters = () => {
    setSearchTerm(''); setCategoryFilter(''); setSubcatFilter('');
    setStockFilter('all'); setSort('name-asc'); setPage(1);
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
  };

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

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Products</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href="/products/bulk"><Upload className="mr-2 h-4 w-4" /> Bulk Import</Link>
          </Button>
          <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
            <Link href="/products/new"><Plus className="mr-2 h-4 w-4" /> Add Product</Link>
          </Button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
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
              onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
            />
          </div>

          {/* Category */}
          <Select
            value={categoryFilter || '__all__'}
            onValueChange={(v) => { setCategoryFilter(v === '__all__' ? '' : v); setSubcatFilter(''); resetPage(); }}
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

          {/* Subcategory — only visible when category chosen and options exist */}
          {categoryFilter && subcatOptions.length > 0 && (
            <Select
              value={subcatFilter || '__all__'}
              onValueChange={(v) => { setSubcatFilter(v === '__all__' ? '' : v); resetPage(); }}
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
          <Select value={stockFilter} onValueChange={(v: 'all' | 'in' | 'out') => { setStockFilter(v); resetPage(); }}>
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
          <Select value={sort} onValueChange={(v) => { setSort(v); resetPage(); }}>
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
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground gap-1">
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
                  <tr key={product.id} className={`hover:bg-muted/30 transition-colors ${!product.enabled ? 'opacity-60' : ''}`}>
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
                        {product.isBestSeller && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-accent/20 text-accent-foreground border-transparent">Best Seller</Badge>}
                        {product.isDwarikaSpecial && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-primary/10 text-primary border-transparent">Special</Badge>}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm font-medium">{product.categoryId.split(':')[1]?.trim() || product.categoryId}</div>
                      {product.subcategory && <div className="text-xs text-muted-foreground">{product.subcategory}</div>}
                      <div className="flex gap-1 mt-1.5">
                        {product.isBestSeller && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-accent/20 text-accent-foreground border-transparent">Best Seller</Badge>}
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
                          <DropdownMenuItem onClick={() => setLocation(`/products/${product.id}/edit`)}>
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
              Page <span className="font-medium text-foreground">{page}</span> of{' '}
              <span className="font-medium text-foreground">{totalPages.toLocaleString()}</span>
              {' '}·{' '}
              <span className="font-medium text-foreground">{totalFiltered.toLocaleString()}</span> products
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Edit Dialog ──────────────────────────────────────────────── */}
      <QuickEditDialog
        product={quickEditProduct}
        open={!!quickEditProduct}
        onClose={() => setQuickEditProduct(null)}
        onSaved={invalidateAll}
      />
    </div>
  );
}
