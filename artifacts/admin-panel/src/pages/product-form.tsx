import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAdminProduct, useUpdateAdminProduct, useGetAdminProduct, useDeleteAdminProduct, getGetAdminProductQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2, Save, Trash2, Image as ImageIcon, Upload, X, Sparkles } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-fetch';

// ── Subcategory normalisation (mirrors server logic) ──────────────────────────
function titleCase(s: string): string {
  return s.trim().replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// ── Category / subcategory helpers ────────────────────────────────────────────

function useAdminCategoryList() {
  return useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/admin/categories'],
    queryFn: () => adminFetch<{ id: number; name: string }[]>('/api/admin/categories'),
  });
}

function useSubcategoryOptions(categoryId: string) {
  return useQuery<string[]>({
    queryKey: ['/api/admin/categories', categoryId, 'subcategories'],
    queryFn: async () => {
      const data = await adminFetch<Array<{ name: string } | string>>(
        `/api/admin/categories/${categoryId}/subcategories`,
      );
      return (data ?? []).map((d) => (typeof d === 'string' ? d : d.name));
    },
    enabled: !!categoryId,
  });
}

// ── Form schema ───────────────────────────────────────────────────────────────

const productSchema = z.object({
  name:             z.string().min(1, 'Product name is required'),
  brand:            z.string().min(1, 'Brand is required'),
  sku:              z.string().optional(),
  categoryId:       z.string().min(1, 'Category is required'),
  subcategory:      z.string().optional(),
  weight:           z.string().min(1, 'Weight/Size is required (e.g. 500g, 1L)'),
  mrp:              z.coerce.number().min(0, 'MRP must be positive'),
  price:            z.coerce.number().min(0, 'Price must be positive'),
  stockQty:         z.coerce.number().min(0, 'Stock quantity cannot be negative'),
  description:      z.string().optional(),
  imageUrl:         z.string().optional(),
  inStock:          z.boolean().default(true),
  enabled:          z.boolean().default(true),
  isBestSeller:     z.boolean().default(false),
  isDwarikaSpecial: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ── Section card wrapper ───────────────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border bg-muted/30">
        <h2 className="font-semibold text-base">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Main form component ───────────────────────────────────────────────────────

export default function ProductForm() {
  const [, setLocation] = useLocation();
  const params          = useParams();
  const isNew           = !params.id || params.id === 'new';
  const productId       = isNew ? null : parseInt(params.id!, 10);
  const { toast }       = useToast();
  const queryClient     = useQueryClient();

  // Navigate back to the products list, restoring the page/filter state that
  // was saved in sessionStorage by the products page before navigating here.
  const navigateBack = () => {
    const returnUrl = sessionStorage.getItem('products-return-url') || '/products';
    sessionStorage.removeItem('products-return-url');
    setLocation(returnUrl);
  };

  const { data: categoryList = [] } = useAdminCategoryList();

  const { data: product, isLoading: isLoadingProduct } = useGetAdminProduct(productId as number, {
    query: { queryKey: getGetAdminProductQueryKey(productId ?? 0), enabled: !isNew && !!productId },
  });

  const { mutate: createProduct, isPending: isCreating } = useCreateAdminProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateAdminProduct();
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteAdminProduct();
  const isSaving = isCreating || isUpdating;

  const { uploadImage, isUploading, error: uploadError, progress: uploadProgress, lastResult: uploadResult } = useImageUpload();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', brand: '', sku: '', categoryId: '', subcategory: '',
      weight: '', mrp: 0, price: 0, stockQty: 100,
      description: '', imageUrl: '',
      inStock: true, enabled: true, isBestSeller: false, isDwarikaSpecial: false,
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (product && !isNew) {
      form.reset({
        name:             product.name,
        brand:            product.brand,
        sku:              product.sku              || '',
        categoryId:       product.categoryId,
        subcategory:      product.subcategory      || '',
        weight:           product.weight,
        mrp:              product.mrp,
        price:            product.price,
        stockQty:         product.stockQty,
        description:      product.description      || '',
        imageUrl:         product.imageUrl         || '',
        inStock:          product.inStock,
        enabled:          product.enabled,
        isBestSeller:     product.isBestSeller,
        isDwarikaSpecial: product.isDwarikaSpecial,
      });
    }
  }, [product, isNew, form]);

  // ── Subcategory smart select ──────────────────────────────────────────────
  const [subcatMode, setSubcatMode] = useState<'select' | 'custom'>('select');
  const watchedCategoryId           = form.watch('categoryId');
  const prevCategoryIdRef           = useRef<string>('');

  const { data: subcategoryOptions = [] } = useSubcategoryOptions(watchedCategoryId);

  useEffect(() => {
    const prev = prevCategoryIdRef.current;
    prevCategoryIdRef.current = watchedCategoryId;
    if (prev && prev !== watchedCategoryId) {
      form.setValue('subcategory', '');
      setSubcatMode('select');
    }
  }, [watchedCategoryId, form]);

  useEffect(() => {
    if (!isNew && product) {
      const current = form.getValues('subcategory') ?? '';
      if (current && !subcategoryOptions.includes(current)) setSubcatMode('custom');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcategoryOptions, product]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = (values: ProductFormValues) => {
    if (isNew) {
      createProduct({ data: values }, {
        onSuccess: () => {
          toast({ title: 'Product created successfully' });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
          navigateBack();
        },
        onError: (err: unknown) => {
          toast({ title: 'Failed to create product', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
        },
      });
    } else {
      updateProduct({ id: productId as number, data: values }, {
        onSuccess: () => {
          toast({ title: 'Product updated successfully' });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/products', productId] });
          navigateBack();
        },
        onError: (err: unknown) => {
          toast({ title: 'Failed to update product', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
        },
      });
    }
  };

  const handleDelete = () => {
    if (!productId) return;
    deleteProduct({ id: productId }, {
      onSuccess: () => {
        toast({ title: 'Product deleted' });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
        navigateBack();
      },
      onError: (err: unknown) => {
        toast({ title: 'Failed to delete product', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
      },
    });
  };

  if (!isNew && isLoadingProduct) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const imageUrlValue = form.watch('imageUrl');

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32">

      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={navigateBack} className="shrink-0 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex-1">
          {isNew ? 'Add New Product' : 'Edit Product'}
        </h1>
        {!isNew && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the product and remove it from the store.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Product
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Section 1: Product Image ──────────────────────────────────── */}
          <SectionCard title="Product Image" description="Upload a product photo. Supports JPG, PNG, WebP.">
            <div className="flex flex-col sm:flex-row gap-6 items-start">

              {/* Preview */}
              <div className="shrink-0">
                <div className="h-36 w-36 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden relative">
                  {imageUrlValue ? (
                    <img
                      key={imageUrlValue}
                      src={imageUrlValue}
                      alt="Product preview"
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                      <ImageIcon className="h-10 w-10" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>

              {/* Upload controls */}
              <div className="flex-1 space-y-3 pt-1">
                <input type="hidden" {...form.register('imageUrl')} />
                <div className="flex flex-wrap gap-3 items-center">
                  <label
                    htmlFor="product-image-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium cursor-pointer transition-colors
                      ${isUploading
                        ? 'border-border bg-muted text-muted-foreground cursor-not-allowed'
                        : 'border-border bg-background hover:bg-muted text-foreground'}`}
                  >
                    {isUploading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading… {uploadProgress}%</>
                      : <><Upload className="h-4 w-4" /> Choose Image</>}
                  </label>

                  {imageUrlValue && !isUploading && (
                    <button
                      type="button"
                      onClick={() => form.setValue('imageUrl', '', { shouldValidate: true })}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>

                <input
                  id="product-image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={isUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    const result = await uploadImage(file);
                    if (result) {
                      form.setValue('imageUrl', result.imageUrl, { shouldValidate: true });
                    }
                  }}
                />

                {uploadError && <p className="text-sm text-destructive">{uploadError.message}</p>}
                {uploadResult && !isUploading && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Optimised: {Math.round(uploadResult.originalSize / 1024)} KB → {Math.round(uploadResult.optimizedSize / 1024)} KB (WebP 600×600)
                  </p>
                )}
                {imageUrlValue && !isUploading && !uploadResult && (
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">{imageUrlValue}</p>
                )}
                {!imageUrlValue && !isUploading && (
                  <p className="text-xs text-muted-foreground">Upload any JPEG/PNG — automatically resized to 600×600 WebP.</p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ── Section 2: Basic Details ──────────────────────────────────── */}
          <SectionCard title="Basic Details" description="Product name, brand, SKU, and categorization.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Product Name — full width */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Aashirvaad Shudh Chakki Atta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Brand */}
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Aashirvaad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SKU */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU / Item Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ITM-001 (from Vyapar)" {...field} />
                    </FormControl>
                    <FormDescription>Item code from Vyapar — used as priority match for inventory sync.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryList.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subcategory */}
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory (Optional)</FormLabel>
                    {subcatMode === 'select' ? (
                      <Select
                        value={field.value || '__none__'}
                        onValueChange={(val) => {
                          if (val === '__custom__')     { setSubcatMode('custom'); field.onChange(''); }
                          else if (val === '__none__')  { field.onChange(''); }
                          else                          { field.onChange(val); }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subcategory" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {subcategoryOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                          <SelectItem value="__custom__">✏️ Type a custom value…</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="e.g. Poha & Dalia" {...field} />
                          </FormControl>
                          {subcategoryOptions.length > 0 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setSubcatMode('select')} className="shrink-0">
                              Pick from list
                            </Button>
                          )}
                        </div>
                        {/* Case-mismatch hint */}
                        {(() => {
                          const typed = field.value?.trim() ?? '';
                          if (!typed) return null;
                          const normalized = titleCase(typed);
                          const existingMatch = subcategoryOptions.find(
                            (opt) => opt.toLowerCase() === typed.toLowerCase(),
                          );
                          if (existingMatch && existingMatch !== typed) {
                            return (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Matches existing subcategory <strong>"{existingMatch}"</strong> — will be saved as "{existingMatch}".
                              </p>
                            );
                          }
                          if (!existingMatch && normalized !== typed) {
                            return (
                              <p className="text-xs text-muted-foreground mt-1">
                                Will be saved as <strong>"{normalized}"</strong>.
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </>
                    )}
                    <FormDescription>
                      {!watchedCategoryId
                        ? 'Select a category first.'
                        : subcategoryOptions.length === 0
                        ? 'No subcategories yet — type a custom value.'
                        : 'Groups products within a category (e.g. Atta, Rice).'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>

          {/* ── Section 3: Pricing & Stock ────────────────────────────────── */}
          <SectionCard title="Pricing & Stock" description="Weight, price, and inventory details.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Weight */}
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight / Size *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 5kg, 500g, 1L" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stock Qty */}
              <FormField
                control={form.control}
                name="stockQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* MRP */}
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP (₹) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selling Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (₹) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormDescription>The actual price the customer pays.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>

          {/* ── Section 4: Description & Status ──────────────────────────── */}
          <SectionCard title="Description & Status" description="Product description and visibility settings.">
            <div className="space-y-6">

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief product description…" className="resize-none h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <FormField
                  control={form.control}
                  name="inStock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">In Stock</FormLabel>
                        <FormDescription>Customers can order this product.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active / Enabled</FormLabel>
                        <FormDescription>Product is visible in the store.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isBestSeller"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-accent/5">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-accent-foreground">Best Seller</FormLabel>
                        <FormDescription>Highlight as a popular product.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-accent" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDwarikaSpecial"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-primary/5">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-primary">Dwarika Special</FormLabel>
                        <FormDescription>Highlight as a store special.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </SectionCard>

          {/* ── Sticky Save button ────────────────────────────────────────── */}
          <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-end gap-3 bg-background/90 backdrop-blur-md px-6 py-4 border-t border-border shadow-lg md:sticky md:bottom-6 md:left-auto md:right-auto md:rounded-xl md:border md:shadow-md md:mx-0">
            <Button type="button" variant="outline" onClick={navigateBack} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isUploading} className="min-w-[140px]">
              {isUploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading image…</>
              ) : isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isNew ? 'Creating…' : 'Saving…'}</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />{isNew ? 'Create Product' : 'Save Changes'}</>
              )}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
