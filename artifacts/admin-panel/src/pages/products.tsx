import { useState } from 'react';
import { useListAdminProducts, useToggleProductStock } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Search, Plus, Upload, Loader2, Package, Check, X, Pencil, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/use-debounce';

export default function Products() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useListAdminProducts({
    q: debouncedSearch || undefined,
  });

  const { mutate: toggleStock } = useToggleProductStock();

  const handleStockToggle = (id: number, inStock: boolean) => {
    // Optimistic update
    queryClient.setQueryData(
      ['/api/admin/products', { q: debouncedSearch || undefined }],
      (old: any) => {
        if (!old) return old;
        return old.map((p: any) => p.id === id ? { ...p, inStock } : p);
      }
    );

    toggleStock({ id, data: { inStock } }, {
      onError: () => {
        // Revert on error
        queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      }
    });
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Products</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/products/bulk">
              <Upload className="mr-2 h-4 w-4" /> Bulk Import
            </Link>
          </Button>
          <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
            <Link href="/products/new">
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-border shrink-0 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, brand or SKU…" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
            />
          </div>
          <div className="text-sm text-muted-foreground hidden sm:block">
            {products.length} products
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try adjusting your search or add a new product.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium w-12"></th>
                  <th className="px-4 py-3 font-medium">Product Details</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-center">In Stock</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr key={product.id} className={`hover:bg-muted/30 transition-colors ${!product.enabled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 rounded-md bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground truncate max-w-[200px] md:max-w-xs" title={product.name}>
                        {product.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {product.brand} • {product.weight}
                      </div>
                      {product.sku && (
                        <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                          SKU: {product.sku}
                        </div>
                      )}
                      <div className="flex gap-1 mt-1.5 md:hidden">
                        {product.isBestSeller && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-accent/20 text-accent-foreground border-transparent">Best Seller</Badge>}
                        {product.isDwarikaSpecial && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-primary/10 text-primary border-transparent">Special</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm font-medium">{product.categoryId.split(':')[1]?.trim() || product.categoryId}</div>
                      <div className="flex gap-1 mt-1.5">
                        {product.isBestSeller && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-accent/20 text-accent-foreground border-transparent">Best Seller</Badge>}
                        {product.isDwarikaSpecial && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-transparent">Special</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-foreground">₹{product.price}</div>
                      {product.mrp > product.price && (
                        <div className="text-xs text-muted-foreground line-through">₹{product.mrp}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch 
                        checked={product.inStock}
                        onCheckedChange={(checked) => handleStockToggle(product.id, checked)}
                        className="data-[state=checked]:bg-primary"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.enabled ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Disabled</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
          )}
        </div>
      </div>
    </div>
  );
}
