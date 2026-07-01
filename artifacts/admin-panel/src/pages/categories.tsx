import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Pencil, Trash2, Image as ImageIcon, Upload, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUpload } from '@workspace/object-storage-web';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminCategory {
  id: number;
  name: string;
  emoji: string | null;
  imageUrl: string | null;
  status: string;
  displayOrder: number;
}

type CategoryFormData = {
  name: string;
  emoji: string;
  imageUrl: string;
  status: 'active' | 'inactive';
  displayOrder: number;
};

/** Payload sent to the API — optional nullable fields are separate from the form model */
type CategoryPayload = {
  name?: string;
  emoji?: string | null;
  imageUrl?: string | null;
  status?: 'active' | 'inactive';
  displayOrder?: number;
};

// ── API helpers ───────────────────────────────────────────────────────────────

const adminFetch = (url: string, options?: RequestInit) =>
  fetch(url, { credentials: 'include', ...options }).then(async (r) => {
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error((d as any).error ?? `HTTP ${r.status}`);
    }
    return r.status === 204 ? null : r.json();
  });

function useAdminCategories() {
  return useQuery<AdminCategory[]>({
    queryKey: ['/api/admin/categories'],
    queryFn: () => adminFetch('/api/admin/categories'),
  });
}

function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryPayload) =>
      adminFetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/admin/categories'] }),
  });
}

function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryPayload }) =>
      adminFetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/admin/categories'] }),
  });
}

function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      adminFetch(`/api/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/admin/categories'] }),
  });
}

// ── Category Form Dialog ──────────────────────────────────────────────────────

function CategoryDialog({
  open,
  initial,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  initial: CategoryFormData;
  onClose: () => void;
  onSave: (data: CategoryFormData) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<CategoryFormData>(initial);
  const { uploadFile, isUploading, progress } = useUpload();

  // Reset form when dialog opens with new initial data
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setForm(initial);
  }

  const set = (key: keyof CategoryFormData, value: string | number | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial.name ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Category Name *</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Dairy & Bread"
            />
          </div>

          {/* Emoji */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-emoji">Emoji Icon</Label>
            <Input
              id="cat-emoji"
              value={form.emoji}
              onChange={(e) => set('emoji', e.target.value)}
              placeholder="e.g. 🥛"
              className="text-xl"
              maxLength={4}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Category Image</Label>
            <div className="flex items-center gap-3">
              {/* Preview */}
              {form.imageUrl && (
                <div className="h-14 w-14 rounded-xl overflow-hidden border border-border bg-muted shrink-0">
                  <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              {!form.imageUrl && (
                <div className="h-14 w-14 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="cat-image-upload"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer transition-colors ${
                    isUploading
                      ? 'border-border bg-muted text-muted-foreground cursor-not-allowed'
                      : 'border-border bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  {isUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {progress}%</>
                  ) : (
                    <><Upload className="h-4 w-4" /> {form.imageUrl ? 'Change Image' : 'Choose Image'}</>
                  )}
                </label>
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => set('imageUrl', '')}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>

              <input
                id="cat-image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  const result = await uploadFile(file);
                  if (result) {
                    set('imageUrl', `/api/storage${result.objectPath}`);
                  }
                }}
              />
            </div>
          </div>

          {/* Status + Order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-order">Display Order</Label>
              <Input
                id="cat-order"
                type="number"
                value={form.displayOrder}
                onChange={(e) => set('displayOrder', Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <div className="flex items-center justify-between rounded-lg border border-border p-3 h-10">
                <Label className="text-sm cursor-pointer" htmlFor="cat-status">Active</Label>
                <Switch
                  id="cat-status"
                  checked={form.status === 'active'}
                  onCheckedChange={(c) => set('status', c ? 'active' : 'inactive')}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving || isUploading}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={isSaving || isUploading || !form.name.trim()}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: CategoryFormData = {
  name: '',
  emoji: '',
  imageUrl: '',
  status: 'active',
  displayOrder: 0,
};

export default function Categories() {
  const { data: categories = [], isLoading } = useAdminCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory } = useDeleteCategory();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<{ open: boolean; id: number | null; form: CategoryFormData }>({
    open: false,
    id: null,
    form: EMPTY_FORM,
  });

  const openNew = () => {
    setDialogState({
      open: true,
      id: null,
      form: {
        ...EMPTY_FORM,
        displayOrder: categories.length > 0
          ? Math.max(...categories.map((c) => c.displayOrder)) + 10
          : 10,
      },
    });
  };

  const openEdit = (cat: AdminCategory) => {
    setDialogState({
      open: true,
      id: cat.id,
      form: {
        name: cat.name,
        emoji: cat.emoji ?? '',
        imageUrl: cat.imageUrl ?? '',
        status: cat.status === 'inactive' ? 'inactive' : 'active',
        displayOrder: cat.displayOrder,
      },
    });
  };

  const closeDialog = () => setDialogState((s) => ({ ...s, open: false }));

  const handleSave = (data: CategoryFormData) => {
    const payload: CategoryPayload = {
      name: data.name,
      emoji: data.emoji || null,
      imageUrl: data.imageUrl || null,
      status: data.status,
      displayOrder: data.displayOrder,
    };

    if (dialogState.id === null) {
      createCategory(payload, {
        onSuccess: () => {
          closeDialog();
          toast({ title: 'Category created' });
        },
        onError: (err: any) => {
          toast({ title: 'Failed to create category', description: err.message, variant: 'destructive' });
        },
      });
    } else {
      updateCategory({ id: dialogState.id, data: payload }, {
        onSuccess: () => {
          closeDialog();
          toast({ title: 'Category updated' });
        },
        onError: (err: any) => {
          toast({ title: 'Failed to update category', description: err.message, variant: 'destructive' });
        },
      });
    }
  };

  const handleToggle = (cat: AdminCategory, enabled: boolean) => {
    updateCategory(
      { id: cat.id, data: { status: (enabled ? 'active' : 'inactive') as 'active' | 'inactive' } },
      {
        onError: (err: any) => {
          toast({ title: 'Failed to update status', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleDelete = (cat: AdminCategory) => {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    deleteCategory(cat.id, {
      onSuccess: () => toast({ title: 'Category deleted' }),
      onError: (err: any) =>
        toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' }),
    });
  };

  const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage product categories shown in the customer app.
          </p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-xl m-4">
            <ImageIcon className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No categories</p>
            <p className="text-sm mb-4">Add categories to organise your products.</p>
            <Button onClick={openNew} variant="outline">Add First Category</Button>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium w-8"></th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell text-center">Order</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                  {/* Drag handle visual (non-functional, order set via form) */}
                  <td className="pl-4 py-3 text-muted-foreground/40">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Image or emoji */}
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover" />
                        ) : cat.emoji ? (
                          <span className="text-xl">{cat.emoji}</span>
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{cat.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {cat.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-center">
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{cat.displayOrder}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={cat.status === 'active'}
                      onCheckedChange={(c) => handleToggle(cat, c)}
                      disabled={isUpdating}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CategoryDialog
        open={dialogState.open}
        initial={dialogState.form}
        onClose={closeDialog}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />
    </div>
  );
}
