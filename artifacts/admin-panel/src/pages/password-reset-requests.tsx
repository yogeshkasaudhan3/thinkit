import { useState } from 'react';
import {
  useListPasswordResetRequests,
  useGenerateTempPassword,
  useCompletePasswordResetRequest,
  useRejectPasswordResetRequest,
  getListPasswordResetRequestsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { KeyRound, Loader2, Check, X, User, Copy, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const cfg = map[status] ?? { label: status, className: '' };
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}

export default function PasswordResetRequests() {
  const { data: requests, isLoading } = useListPasswordResetRequests();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [viewCustomer, setViewCustomer] = useState<{ name: string; mobile: string } | null>(null);
  const [tempPasswordResult, setTempPasswordResult] = useState<{ password: string; customerName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListPasswordResetRequestsQueryKey() });

  const { mutate: generate, isPending: isGenerating } = useGenerateTempPassword();
  const { mutate: complete, isPending: isCompleting } = useCompletePasswordResetRequest();
  const { mutate: reject, isPending: isRejecting } = useRejectPasswordResetRequest();

  const handleGenerate = (id: number, customerName: string) => {
    generate(
      { id },
      {
        onSuccess: (result) => {
          setTempPasswordResult({ password: result.temporaryPassword, customerName });
          invalidate();
        },
        onError: () => toast({ title: 'Failed to generate temporary password', variant: 'destructive' }),
      }
    );
  };

  const handleComplete = (id: number) => {
    complete({ id }, {
      onSuccess: () => { invalidate(); toast({ title: 'Request marked as completed' }); },
      onError: () => toast({ title: 'Failed to update request', variant: 'destructive' }),
    });
  };

  const handleReject = (id: number) => {
    reject({ id }, {
      onSuccess: () => { invalidate(); toast({ title: 'Request rejected' }); },
      onError: () => toast({ title: 'Failed to update request', variant: 'destructive' }),
    });
  };

  const handleCopy = async () => {
    if (!tempPasswordResult) return;
    try {
      await navigator.clipboard.writeText(tempPasswordResult.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — admin can still read/select the text manually
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Password Reset Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manually verify customers and issue temporary passwords. This is a temporary process until OTP-based reset is available.
        </p>
      </div>

      <div className="bg-card rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading requests...
          </div>
        ) : !requests?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <KeyRound className="h-8 w-8 opacity-40" />
            <p className="text-sm">No password reset requests yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.customerName}</TableCell>
                  <TableCell>{r.customerMobile}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(r.createdAt), 'dd MMM yyyy, h:mm a')}
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewCustomer({ name: r.customerName, mobile: r.customerMobile })}
                      >
                        <User className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      {r.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleGenerate(r.id, r.customerName)}
                            disabled={isGenerating}
                          >
                            <KeyRound className="h-3.5 w-3.5 mr-1" /> Generate Temp Password
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleComplete(r.id)}
                            disabled={isCompleting}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Mark Completed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleReject(r.id)}
                            disabled={isRejecting}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* View customer dialog */}
      <Dialog open={!!viewCustomer} onOpenChange={(o) => !o && setViewCustomer(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Customer</DialogTitle>
          </DialogHeader>
          {viewCustomer && (
            <div className="space-y-1 py-2">
              <p className="font-medium">{viewCustomer.name}</p>
              <p className="text-sm text-muted-foreground">{viewCustomer.mobile}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCustomer(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary password result dialog — shown once, never retrievable again */}
      <Dialog open={!!tempPasswordResult} onOpenChange={(o) => !o && setTempPasswordResult(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <KeyRound className="h-5 w-5" /> Temporary Password
            </DialogTitle>
          </DialogHeader>
          {tempPasswordResult && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Share this with <span className="font-medium text-foreground">{tempPasswordResult.customerName}</span> over
                a verified call. It will only be shown once and cannot be retrieved again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted rounded-md px-3 py-2 text-center font-mono text-lg font-bold tracking-wider">
                  {tempPasswordResult.password}
                </code>
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <CheckCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setTempPasswordResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
