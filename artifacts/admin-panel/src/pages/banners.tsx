import { useState } from 'react';
import { useListAdminBanners, useUpdateAdminBanner, useDeleteAdminBanner, useCreateAdminBanner } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, GripVertical, Image as ImageIcon, Trash2, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';

const bannerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  buttonText: z.string().optional(),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  bg: z.string().optional(),
  enabled: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
});

export default function Banners() {
  const { data: banners = [], isLoading } = useListAdminBanners();
  const { mutate: updateBanner } = useUpdateAdminBanner();
  const { mutate: deleteBanner } = useDeleteAdminBanner();
  const { mutate: createBanner } = useCreateAdminBanner();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState<number | 'new' | null>(null);

  const form = useForm<z.infer<typeof bannerSchema>>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: '', subtitle: '', buttonText: '', imageUrl: '', bg: '', enabled: true, sortOrder: 0
    }
  });

  const handleToggle = (id: number, enabled: boolean) => {
    updateBanner({ id, data: { enabled } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] })
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this banner?')) {
      deleteBanner({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] })
      });
    }
  };

  const openEdit = (banner: any) => {
    form.reset({
      title: banner.title,
      subtitle: banner.subtitle || '',
      buttonText: banner.buttonText || '',
      imageUrl: banner.imageUrl || '',
      bg: banner.bg || '',
      enabled: banner.enabled,
      sortOrder: banner.sortOrder,
    });
    setIsEditing(banner.id);
  };

  const openNew = () => {
    form.reset({
      title: '', subtitle: '', buttonText: '', imageUrl: '', bg: 'bg-primary/10', enabled: true, sortOrder: banners.length * 10
    });
    setIsEditing('new');
  };

  const onSubmit = (values: z.infer<typeof bannerSchema>) => {
    if (isEditing === 'new') {
      createBanner({ data: values }, {
        onSuccess: () => {
          setIsEditing(null);
          queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
          toast({ title: 'Banner created' });
        }
      });
    } else if (typeof isEditing === 'number') {
      updateBanner({ id: isEditing, data: values }, {
        onSuccess: () => {
          setIsEditing(null);
          queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
          toast({ title: 'Banner updated' });
        }
      });
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Banners</h1>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Banner
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex-1 min-h-0 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <ImageIcon className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No banners added</p>
            <p className="text-sm mb-4">Create banners to show on the customer app home screen.</p>
            <Button onClick={openNew} variant="outline">Create First Banner</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.sort((a,b) => a.sortOrder - b.sortOrder).map(banner => (
              <div key={banner.id} className={`border border-border rounded-xl overflow-hidden flex flex-col bg-background ${!banner.enabled ? 'opacity-60' : ''}`}>
                <div className={`p-6 flex-1 flex flex-col sm:flex-row gap-4 justify-between items-center ${banner.bg || 'bg-muted/30'}`}>
                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-xl">{banner.title}</h3>
                    {banner.subtitle && <p className="text-sm opacity-80">{banner.subtitle}</p>}
                    {banner.buttonText && (
                      <Badge variant="secondary" className="mt-2">{banner.buttonText}</Badge>
                    )}
                  </div>
                  {banner.imageUrl && (
                    <img src={banner.imageUrl} alt={banner.title} className="w-24 h-24 object-cover rounded-lg shrink-0 border border-border/20 shadow-sm bg-white" />
                  )}
                </div>
                <div className="p-3 bg-muted/50 border-t border-border flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <Switch checked={banner.enabled} onCheckedChange={(c) => handleToggle(banner.id, c)} />
                    <span className="text-xs font-medium text-muted-foreground">{banner.enabled ? 'Active' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-muted-foreground mr-2" title="Sort Order">Ord: {banner.sortOrder}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(banner)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(banner.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isEditing !== null} onOpenChange={(open) => !open && setIsEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing === 'new' ? 'Add New Banner' : 'Edit Banner'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buttonText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Text</FormLabel>
                      <FormControl><Input placeholder="e.g. Shop Now" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background Class</FormLabel>
                      <FormControl><Input placeholder="e.g. bg-primary/10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 pt-4 h-[68px]">
                      <FormLabel className="text-sm mt-0">Enabled</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditing(null)}>Cancel</Button>
                <Button type="submit">Save Banner</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
