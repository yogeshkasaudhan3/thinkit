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
import { Volume2, AlertCircle, ShoppingBag } from 'lucide-react';

export function OrderAlarm() {
  const [newOrder, setNewOrder] = useState<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const queryClient = useQueryClient();
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus();
  const [, setLocation] = useLocation();

  const startAlarm = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (intervalRef.current) clearInterval(intervalRef.current);

    const playBeep = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    };

    intervalRef.current = setInterval(() => {
      playBeep();
      setTimeout(playBeep, 200);
    }, 1000);
  };

  const stopAlarm = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    const sse = new EventSource('/api/admin/orders/stream');
    
    sse.addEventListener('newOrder', (e) => {
      try {
        const orderData = JSON.parse(e.data);
        setNewOrder(orderData);
        startAlarm();
        
        // Invalidate queries to refresh dashboard and order lists
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
      } catch (err) {
        console.error('Error parsing SSE new order', err);
      }
    });

    sse.onerror = (e) => {
      console.error('SSE Error:', e);
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
        stopAlarm();
        setNewOrder(null);
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
      }
    });
  };

  const handleView = () => {
    if (!newOrder) return;
    setLocation(`/orders`);
    // Alarm keeps playing until accepted
  };

  return (
    <Dialog open={!!newOrder} onOpenChange={(open) => !open && stopAlarm()}>
      <DialogContent className="sm:max-w-md border-destructive/50 shadow-destructive/20 border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 animate-pulse" />
            NEW ORDER RECEIVED
          </DialogTitle>
          <DialogDescription>
            You have a new order that requires your attention.
          </DialogDescription>
        </DialogHeader>
        
        {newOrder && (
          <div className="bg-muted p-4 rounded-md space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{newOrder.customerName}</span>
              <span className="font-mono text-sm">{newOrder.orderNumber}</span>
            </div>
            
            <div className="text-2xl font-bold text-primary">
              ₹{newOrder.grandTotal}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {newOrder.items?.length || 0} items
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between flex-row items-center gap-2 pt-4">
          <div className="flex items-center text-xs text-muted-foreground gap-1.5 font-medium">
            <Volume2 className="h-4 w-4 animate-pulse text-destructive" />
            Alarm playing
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleView} disabled={isPending}>
              View Orders
            </Button>
            <Button variant="default" onClick={handleAccept} disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Accept Order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
