import { useState, useEffect } from 'react';
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
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2, Save, Trash2, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useUpload } from '@workspace/object-storage-web';
import { useToast } from '@/hooks/use-toast';

// Fetched dynamically from the admin API so category management is in sync
import { useQuery } from '@tanstack/react-query';

function useAdminCategoryList() {
  return useQuery<{ id: number; name: string }[]>({
    queryKey: ['/api/admin/categories'],
    queryFn: () =>
      fetch('/api/admin/categories', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : [])),
  });
}

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  brand: z.string().min(1, 'Brand is required'),
  categoryId: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  mrp: z.coerce.number().min(0, 'MRP must be positive'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  weight: z.string().min(1, 'Weight/Size is required (e.g. 500g, 1L)'),
  imageUrl: z.string().optional(),
  stockQty: z.coerce.number().min(0, 'Stock quantity cannot be negative'),
  inStock: z.boolean().default(true),
  enabled: z.boolean().default(true),
  isBestSeller: z.boolean().default(false),
  isDwarikaSpecial: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const isNew = !params.id || params.id === 'new';
  const productId = isNew ? null : parseInt(params.id!, 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categoryList = [] } = useAdminCategoryList();

  const { data: product, isLoading: isLoadingProduct } = useGetAdminProduct(productId as number, {
    query: { queryKey: getGetAdminProductQueryKey(productId ?? 0), enabled: !isNew && !!productId }
  });

  const { mutate: createProduct, isPending: isCreating } = useCreateAdminProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateAdminProduct();
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteAdminProduct();

  const isSaving = isCreating || isUpdating;

  const {
    uploadFile,
    isUploading,
    error: uploadError,
    progress: uploadProgress,
  } = useUpload();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      brand: '',
      categoryId: '',
      subcategory: '',
      description: '',
      mrp: 0,
      price: 0,
      weight: '',
      imageUrl: '',
      stockQty: 100,
      inStock: true,
      enabled: true,
      isBestSeller: false,
      isDwarikaSpecial: false,
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (product && !isNew) {
      form.reset({
        name: product.name,
        brand: product.brand,
        categoryId: product.categoryId,
        subcategory: product.subcategory || '',
        description: product.description || '',
        mrp: product.mrp,
        price: product.price,
        weight: product.weight,
        imageUrl: product.imageUrl || '',
        stockQty: product.stockQty,
        inStock: product.inStock,
        enabled: product.enabled,
        isBestSeller: product.isBestSeller,
        isDwarikaSpecial: product.isDwarikaSpecial,
      });
    }
  }, [product, isNew, form]);

  const onSubmit = (values: ProductFormValues) => {
    if (isNew) {
      createProduct({ data: values }, {
        onSuccess: () => {
          toast({ title: 'Product created successfully' });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
          setLocation('/products');
        },
        onError: (err: any) => {
          toast({ title: 'Failed to create product', description: err.message, variant: 'destructive' });
        }
      });
    } else {
      updateProduct({ id: productId as number, data: values }, {
        onSuccess: () => {
          toast({ title: 'Product updated successfully' });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/products', productId] });
          setLocation('/products');
        },
        onError: (err: any) => {
          toast({ title: 'Failed to update product', description: err.message, variant: 'destructive' });
        }
      });
    }
  };

  const handleDelete = () => {
    if (!productId) return;
    deleteProduct({ id: productId }, {
      onSuccess: () => {
        toast({ title: 'Product deleted' });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
        setLocation('/products');
      },
      onError: (err: any) => {
        toast({ title: 'Failed to delete product', description: err.message, variant: 'destructive' });
      }
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/products')} className="shrink-0 rounded-full">
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
                  This action cannot be undone. This will permanently delete the product
                  and remove it from the store.
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-lg">Basic Details</h2>
              <p className="text-sm text-muted-foreground">Product name, brand, and categorization.</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        {categoryList.map(cat => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Whole Wheat" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief product description..." className="resize-none h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-lg">Pricing & Stock</h2>
              <p className="text-sm text-muted-foreground">Manage price, inventory, and visibility.</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP (₹) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (₹) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>The actual price the customer pays.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stockQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border">
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
                        <FormDescription>Highlight as popular.</FormDescription>
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
                        <FormDescription>Highlight as store special.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-lg">Product Image</h2>
              <p className="text-sm text-muted-foreground">Upload an image from your computer. Supports JPG, PNG, WebP.</p>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">

                {/* Upload control */}
                <div className="flex-1 space-y-3">
                  {/* Hidden form field stores the path */}
                  <input type="hidden" {...form.register('imageUrl')} />

                  <div className="flex flex-wrap gap-3 items-center">
                    <label
                      htmlFor="product-image-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium cursor-pointer transition-colors
                        ${isUploading
                          ? 'border-border bg-muted text-muted-foreground cursor-not-allowed'
                          : 'border-border bg-background hover:bg-muted text-foreground'
                        }`}
                    >
                      {isUploading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Uploading… {uploadProgress}%</>
                      ) : (
                        <><Upload className="h-4 w-4" /> Choose Image</>
                      )}
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
                      e.target.value = '';           // reset so same file can be re-selected
                      if (!file) return;
                      const result = await uploadFile(file);
                      if (result) {
                        form.setValue('imageUrl', `/api/storage${result.objectPath}`, { shouldValidate: true });
                      }
                    }}
                  />

                  {uploadError && (
                    <p className="text-sm text-destructive">{uploadError.message}</p>
                  )}

                  {imageUrlValue && (
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">
                      {imageUrlValue}
                    </p>
                  )}

                  {!imageUrlValue && !isUploading && (
                    <p className="text-xs text-muted-foreground">
                      No image selected. Products without images will show a placeholder.
                    </p>
                  )}
                </div>

                {/* Preview */}
                <div className="shrink-0">
                  <label className="mb-2 block text-sm font-medium leading-none">Preview</label>
                  <div className="h-32 w-32 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden relative">
                    {imageUrlValue ? (
                      <img
                        key={imageUrlValue}
                        src={imageUrlValue}
                        alt="Product preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 sticky bottom-6 z-10 bg-background/80 backdrop-blur-md p-4 rounded-xl border border-border shadow-md">
            <Button type="button" variant="outline" onClick={() => setLocation('/products')} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isUploading} className="min-w-[120px]">
              {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading image…</> :
               isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isNew ? 'Creating…' : 'Saving…'}</> :
               <><Save className="h-4 w-4 mr-2" />{isNew ? 'Create Product' : 'Save Changes'}</>}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
