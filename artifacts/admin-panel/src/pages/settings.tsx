import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Loader2, Store, Truck, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminSettings {
  storeName: string;
  contactNumber: string;
  whatsappNumber: string;
  supportEmail: string;
  storeAddress: string;
  businessHours: string;
  deliveryRadiusKm: string;
  freeDeliveryThreshold: number;
  smallCartFeeThreshold: number;
  smallCartFee: number;
  deliveryFee: number;
  handlingFee: number;
  minOrderEnabled: boolean;
  minOrderValue: number;
}

type FormValues = {
  storeName: string;
  contactNumber: string;
  whatsappNumber: string;
  supportEmail: string;
  storeAddress: string;
  businessHours: string;
  deliveryRadiusKm: string;
  freeDeliveryThreshold: string;
  smallCartFeeThreshold: string;
  smallCartFee: string;
  deliveryFee: string;
  handlingFee: string;
  minOrderEnabled: boolean;
  minOrderValue: string;
};

// ── API helpers ───────────────────────────────────────────────────────────────

const adminFetch = (url: string, options?: RequestInit) =>
  fetch(url, { credentials: 'include', ...options }).then(async (r) => {
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error((d as any).error ?? `HTTP ${r.status}`);
    }
    return r.json();
  });

function settingsToForm(s: AdminSettings): FormValues {
  return {
    storeName: s.storeName,
    contactNumber: s.contactNumber,
    whatsappNumber: s.whatsappNumber,
    supportEmail: s.supportEmail,
    storeAddress: s.storeAddress,
    businessHours: s.businessHours,
    deliveryRadiusKm: String(s.deliveryRadiusKm),
    freeDeliveryThreshold: String(s.freeDeliveryThreshold),
    smallCartFeeThreshold: String(s.smallCartFeeThreshold),
    smallCartFee: String(s.smallCartFee),
    deliveryFee: String(s.deliveryFee),
    handlingFee: String(s.handlingFee),
    minOrderEnabled: s.minOrderEnabled,
    minOrderValue: String(s.minOrderValue),
  };
}

function formToPayload(f: FormValues): Partial<AdminSettings> {
  return {
    storeName: f.storeName.trim(),
    contactNumber: f.contactNumber.trim(),
    whatsappNumber: f.whatsappNumber.trim(),
    supportEmail: f.supportEmail.trim(),
    storeAddress: f.storeAddress.trim(),
    businessHours: f.businessHours.trim(),
    deliveryRadiusKm: f.deliveryRadiusKm,
    freeDeliveryThreshold: parseInt(f.freeDeliveryThreshold, 10),
    smallCartFeeThreshold: parseInt(f.smallCartFeeThreshold, 10),
    smallCartFee: parseInt(f.smallCartFee, 10),
    deliveryFee: parseInt(f.deliveryFee, 10),
    handlingFee: parseInt(f.handlingFee, 10),
    minOrderEnabled: f.minOrderEnabled,
    minOrderValue: parseInt(f.minOrderValue, 10),
  };
}

// ── Section card helper ───────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border bg-muted/30 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ['/api/admin/settings'],
    queryFn: () => adminFetch('/api/admin/settings'),
  });

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: (payload: Partial<AdminSettings>) =>
      adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: 'Settings saved', description: 'Changes will reflect in the customer app within minutes.' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    },
  });

  const form = useForm<FormValues>({
    defaultValues: {
      storeName: '',
      contactNumber: '',
      whatsappNumber: '',
      supportEmail: '',
      storeAddress: '',
      businessHours: '',
      deliveryRadiusKm: '3.0',
      freeDeliveryThreshold: '150',
      smallCartFeeThreshold: '100',
      smallCartFee: '20',
      deliveryFee: '20',
      handlingFee: '5',
      minOrderEnabled: false,
      minOrderValue: '0',
    },
  });

  useEffect(() => {
    if (settings) form.reset(settingsToForm(settings));
  }, [settings]);

  const onSubmit = (data: FormValues) => {
    save(formToPayload(data));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Store Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Changes apply to all customer-facing content in real time.
          </p>
        </div>
        <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* ── Store Information ── */}
      <Section
        icon={Store}
        title="Store Information"
        description="Basic store details shown to customers."
      >
        <Field label="Store Name">
          <Input {...form.register('storeName')} placeholder="Dwarika Grocery Mart" />
        </Field>

        <Row>
          <Field label="Contact Number" hint="Used for 'Call Dwarika' button.">
            <Input {...form.register('contactNumber')} placeholder="+91 XXXXXXXXXX" type="tel" />
          </Field>
          <Field label="WhatsApp Support Number" hint="Used for WhatsApp Support button.">
            <Input {...form.register('whatsappNumber')} placeholder="+91 XXXXXXXXXX" type="tel" />
          </Field>
        </Row>

        <Row>
          <Field label="Support Email">
            <Input {...form.register('supportEmail')} placeholder="support@example.com" type="email" />
          </Field>
          <Field label="Business Hours">
            <Input {...form.register('businessHours')} placeholder="8:00 AM – 10:00 PM" />
          </Field>
        </Row>

        <Field label="Store Address">
          <Textarea
            {...form.register('storeAddress')}
            placeholder="Full store address"
            rows={2}
            className="resize-none"
          />
        </Field>
      </Section>

      {/* ── Delivery Settings ── */}
      <Section
        icon={Truck}
        title="Delivery Settings"
        description="Fee structure shown in cart and applied when orders are placed."
      >
        <Row>
          <Field label="Delivery Radius (km)">
            <Input {...form.register('deliveryRadiusKm')} type="number" step="0.1" min="0" placeholder="3.0" />
          </Field>
          <Field label="Free Delivery Above (₹)" hint="Delivery is free when cart total ≥ this.">
            <Input {...form.register('freeDeliveryThreshold')} type="number" min="0" step="1" placeholder="150" />
          </Field>
        </Row>

        <Row>
          <Field label="Delivery Fee (₹)" hint="Charged when below free delivery threshold.">
            <Input {...form.register('deliveryFee')} type="number" min="0" step="1" placeholder="20" />
          </Field>
          <Field label="Handling &amp; Packaging Fee (₹)" hint="Always charged on every order.">
            <Input {...form.register('handlingFee')} type="number" min="0" step="1" placeholder="5" />
          </Field>
        </Row>

        <Row>
          <Field label="Small Cart Fee (₹)" hint="Charged when cart total is below the threshold.">
            <Input {...form.register('smallCartFee')} type="number" min="0" step="1" placeholder="20" />
          </Field>
          <Field label="Small Cart Threshold (₹)" hint="Small cart fee applies when cart total is below this.">
            <Input {...form.register('smallCartFeeThreshold')} type="number" min="0" step="1" placeholder="100" />
          </Field>
        </Row>

        {/* Minimum Order */}
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Minimum Order Value</p>
              <p className="text-xs text-muted-foreground">Block orders below a minimum total.</p>
            </div>
            <Switch
              checked={form.watch('minOrderEnabled')}
              onCheckedChange={(c) => form.setValue('minOrderEnabled', c)}
            />
          </div>
          {form.watch('minOrderEnabled') && (
            <Field label="Minimum Order Amount (₹)">
              <Input {...form.register('minOrderValue')} type="number" min="0" step="1" placeholder="100" />
            </Field>
          )}
        </div>
      </Section>

      {/* Sticky save for mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50">
        <Button type="submit" disabled={isSaving} className="w-full bg-primary text-primary-foreground">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
