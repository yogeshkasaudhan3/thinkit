/**
 * Alternate pack-size (variant) management for a single product. Additive
 * only — a product with zero variant rows keeps its existing single-price
 * behaviour everywhere else in the app. Only rendered when editing an
 * existing product, since variants require a saved product id.
 */
import { useState } from 'react';
import {
  useListProductVariants,
  useCreateProductVariant,
  useUpdateProductVariant,
  useDeleteProductVariant,
  getListProductVariantsQueryKey,
} from '@workspace/api-client-react';
import type { ProductVariant, ProductVariantInput } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const emptyDraft: ProductVariantInput = { name: '', weight: '', mrp: 0, price: 0, stockQty: 0, active: true };

export function ProductVariantsSection({ productId }: { productId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = getListProductVariantsQueryKey(productId);

  const { data: variants = [], isLoading } = useListProductVariants(productId, { query: { queryKey } });
  const { mutate: createVariant, isPending: isCreating } = useCreateProductVariant();
  const { mutate: updateVariant } = useUpdateProductVariant();
  const { mutate: deleteVariant } = useDeleteProductVariant();

  const [draft, setDraft] = useState<ProductVariantInput>(emptyDraft);
  const [adding, setAdding] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const handleAdd = () => {
    if (!draft.name.trim() || !draft.weight.trim()) {
      toast({ title: 'Pack name and weight are required', variant: 'destructive' });
      return;
    }
    createVariant({ id: productId, data: draft }, {
      onSuccess: () => {
        toast({ title: 'Pack size added' });
        setDraft(emptyDraft);
        setAdding(false);
        invalidate();
      },
      onError: (err: unknown) => {
        toast({ title: 'Failed to add pack size', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
      },
    });
  };

  const handleToggleActive = (variant: ProductVariant) => {
    updateVariant({ variantId: variant.id, data: { active: !variant.active } }, {
      onSuccess: invalidate,
      onError: (err: unknown) => {
        toast({ title: 'Failed to update pack size', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
      },
    });
  };

  const handleFieldChange = (variant: ProductVariant, patch: Partial<ProductVariantInput>) => {
    updateVariant({ variantId: variant.id, data: patch }, {
      onSuccess: invalidate,
      onError: (err: unknown) => {
        toast({ title: 'Failed to update pack size', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
      },
    });
  };

  const handleDelete = (variant: ProductVariant) => {
    deleteVariant({ variantId: variant.id }, {
      onSuccess: () => { toast({ title: 'Pack size removed' }); invalidate(); },
      onError: (err: unknown) => {
        toast({ title: 'Failed to delete pack size', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
      },
    });
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : variants.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No alternate pack sizes yet. The product's own weight/price is the only option shown to customers.</p>
      ) : (
        <div className="space-y-3">
          {variants.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
              <Input
                className="w-32"
                defaultValue={v.name}
                onBlur={(e) => e.target.value !== v.name && handleFieldChange(v, { name: e.target.value })}
                placeholder="Pack name"
              />
              <Input
                className="w-24"
                defaultValue={v.weight}
                onBlur={(e) => e.target.value !== v.weight && handleFieldChange(v, { weight: e.target.value })}
                placeholder="Weight"
              />
              <Input
                className="w-24"
                type="number" step="0.01" min="0"
                defaultValue={v.mrp}
                onBlur={(e) => Number(e.target.value) !== v.mrp && handleFieldChange(v, { mrp: Number(e.target.value) })}
                placeholder="MRP"
              />
              <Input
                className="w-24"
                type="number" step="0.01" min="0"
                defaultValue={v.price}
                onBlur={(e) => Number(e.target.value) !== v.price && handleFieldChange(v, { price: Number(e.target.value) })}
                placeholder="Price"
              />
              <Input
                className="w-24"
                type="number" min="0"
                defaultValue={v.stockQty}
                onBlur={(e) => Number(e.target.value) !== v.stockQty && handleFieldChange(v, { stockQty: Number(e.target.value) })}
                placeholder="Stock"
              />
              <div className="flex items-center gap-2">
                <Switch checked={v.active} onCheckedChange={() => handleToggleActive(v)} />
                <span className="text-xs text-muted-foreground">{v.active ? 'Active' : 'Hidden'}</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="ml-auto text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove this pack size?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone. Customers will no longer be able to select "{v.name}".</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(v)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pack name</label>
            <Input className="w-32" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Family Pack" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Weight</label>
            <Input className="w-24" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} placeholder="e.g. 1 kg" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">MRP (₹)</label>
            <Input className="w-24" type="number" step="0.01" min="0" value={draft.mrp} onChange={(e) => setDraft({ ...draft, mrp: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Price (₹)</label>
            <Input className="w-24" type="number" step="0.01" min="0" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Stock</label>
            <Input className="w-24" type="number" min="0" value={draft.stockQty} onChange={(e) => setDraft({ ...draft, stockQty: Number(e.target.value) })} />
          </div>
          <Button type="button" onClick={handleAdd} disabled={isCreating}>
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setAdding(false); setDraft(emptyDraft); }}>Cancel</Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Pack Size
        </Button>
      )}
    </div>
  );
}
