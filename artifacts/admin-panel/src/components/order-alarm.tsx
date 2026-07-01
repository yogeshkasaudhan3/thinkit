import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUpdateOrderStatus,
  getListAdminOrdersQueryKey,
  getGetAdminDashboardQueryKey,
} from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Volume2, AlertCircle, ShoppingBag, Eye } from 'lucide-react';

export function OrderAlarm() {
  const [newOrder, setNewOrder] = useState<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const queryClient = useQueryClient();
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus();
  const [, setLocation] = useLocation();

  // Pre-unlock AudioContext on first user interaction so SSE-triggered alarm works.
  // Chrome suspends AudioContext if it wasn't created during a user gesture; the
  // fix is to create + resume it during the FIRST click/keydown, before any order arrives.
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  const playBeep = (ctx: AudioContext, delay = 0) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + delay + 0.15);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.6);
  };

  const scheduleBeeps = (ctx: AudioContext) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      playBeep(ctx, 0);
      playBeep(ctx, 0.25);
    }, 1000);
  };

  const startAlarm = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => scheduleBeeps(ctx));
    } else {
      scheduleBeeps(ctx);
    }
  };

  const stopAlarm = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const dismissOrder = () => {
    stopAlarm();
    setNewOrder(null);
  };

  useEffect(() => {
    const sse = new EventSource('/api/admin/orders/stream');
    
    sse.addEventListener('newOrder', (e) => {
      try {
        const orderData = JSON.parse(e.data);
        setNewOrder(orderData);
        startAlarm();
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
      } catch (err) {
        console.error('Error parsing SSE new order', err);
      }
    });

    sse.onerror = () => {
      // SSE will auto-reconnect; suppress console noise
    };

    return () => {
      sse.close();
      stopAlarm();
    };
  }, [queryClient]);

  const handleAccept = () => {
    if (!newOrder) return;
    updateStatus({ id: newOrder.id, data: { status: 'accepted' } }, {
      onSuccess: () => {
        dismissOrder();
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
      }
    });
  };

  const handleView = () => {
    if (!newOrder) return;
    // Navigate to this specific order in the slide-over, then dismiss dialog
    setLocation(`/orders?id=${newOrder.id}`);
    dismissOrder();
  };

  return (
    // onOpenChange is intentionally a no-op: the alarm can only be stopped by
    // pressing "Accept Order". Pressing Escape or clicking outside does nothing.
    <Dialog open={!!newOrder} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md border-destructive/50 shadow-destructive/20 border-2"
        // Remove the built-in close (×) button so it's not accidentally dismissed
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 animate-pulse" />
            NEW ORDER RECEIVED
          </DialogTitle>
          <DialogDescription>
            A new order is waiting. Accept it to stop the alarm.
          </DialogDescription>
        </DialogHeader>
        
        {newOrder && (
          <div className="bg-muted p-4 rounded-md space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">{newOrder.customerName}</span>
              <span className="font-mono text-sm text-muted-foreground">{newOrder.orderNumber}</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              ₹{newOrder.grandTotal}
            </div>
            <div className="text-sm text-muted-foreground">
              {newOrder.items?.length || 0} item{newOrder.items?.length !== 1 ? 's' : ''} •{' '}
              {newOrder.paymentMethod?.toUpperCase() ?? 'COD'}
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between flex-row items-center gap-2 pt-4">
          <div className="flex items-center text-xs text-muted-foreground gap-1.5 font-medium">
            <Volume2 className="h-4 w-4 animate-pulse text-destructive" />
            Alarm active
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleView} disabled={isPending}>
              <Eye className="mr-2 h-4 w-4" />
              View Order
            </Button>
            <Button
              variant="default"
              onClick={handleAccept}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Accept Order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
