import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isAfter, subHours } from 'date-fns';
import {
  Upload, RefreshCw, CheckCircle, AlertTriangle,
  Clock, Package, FileText, X, Loader2, Table2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SyncLog {
  id: number;
  fileName: string;
  adminUser: string;
  productsUpdated: number;
  newProducts: number;
  outOfStockCount: number;
  errorCount: number;
  errors: Array<{ row: number; name: string; reason: string }>;
  syncedAt: string;
}

interface SyncSummary {
  productsUpdated: number;
  newProducts: number;
  outOfStockCount: number;
  errorCount: number;
}

// ── API helper ────────────────────────────────────────────────────────────────

const adminFetch = (url: string, options?: RequestInit) =>
  fetch(url, { credentials: 'include', ...options }).then(async (r) => {
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error((d as Record<string, string>).error ?? `HTTP ${r.status}`);
    }
    return r.json();
  });

// ── Stat box ──────────────────────────────────────────────────────────────────

function Stat({ value, label, highlight }: { value: number; label: string; highlight?: 'error' | 'warn' }) {
  const color =
    highlight === 'error' && value > 0
      ? 'text-destructive'
      : highlight === 'warn' && value > 0
        ? 'text-amber-600'
        : 'text-foreground';
  return (
    <div className="text-center p-3">
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ── Column mapping hint ───────────────────────────────────────────────────────

const COLUMN_MAP = [
  { vyapar: 'Item name*',              thinkit: 'Product Name' },
  { vyapar: 'Item code',               thinkit: 'Barcode / SKU' },
  { vyapar: 'Category',                thinkit: 'Category' },
  { vyapar: 'Default Mrp',             thinkit: 'MRP' },
  { vyapar: 'Sale price',              thinkit: 'Selling Price' },
  { vyapar: 'Current stock quantity',  thinkit: 'Stock Quantity' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventorySync() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [xlsxBase64, setXlsxBase64] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    summary: SyncSummary;
    errors: SyncLog['errors'];
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: history, isLoading: historyLoading } = useQuery<SyncLog[]>({
    queryKey: ['/api/admin/inventory-sync/history'],
    queryFn: () => adminFetch('/api/admin/inventory-sync/history'),
    refetchInterval: 30_000,
  });

  const lastSync = history?.[0] ?? null;
  const isSyncStale =
    lastSync ? isAfter(subHours(new Date(), 8), new Date(lastSync.syncedAt)) : true;

  // ── File handling ──────────────────────────────────────────────────────────

  const loadFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an Excel (.xlsx) file exported from Vyapar.',
        variant: 'destructive',
      });
      return;
    }
    // Clear stale base64 immediately so the Sync button stays disabled while reading
    setXlsxBase64('');
    setSelectedFile(file);
    setLastResult(null);

    // Read as data URL → extract base64 payload
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Format: data:<mime>;base64,<data>
      const base64 = dataUrl.split(',')[1] ?? '';
      setXlsxBase64(base64);
    };
    reader.onerror = () => {
      toast({
        title: 'File read failed',
        description: 'Could not read the file. Please try again.',
        variant: 'destructive',
      });
      clearFile();
    };
    reader.onabort = () => clearFile();
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setXlsxBase64('');
    setLastResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  // ── Sync ───────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    if (!selectedFile || !xlsxBase64) return;
    setSyncing(true);
    try {
      const result = await adminFetch('/api/admin/inventory-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xlsxBase64, fileName: selectedFile.name }),
      });
      setLastResult({ summary: result.summary, errors: result.errors });
      qc.invalidateQueries({ queryKey: ['/api/admin/inventory-sync/history'] });
      toast({
        title: 'Inventory sync complete ✓',
        description: `${result.summary.productsUpdated.toLocaleString()} products updated.`,
      });
      clearFile();
    } catch (err: unknown) {
      toast({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory Sync</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a Vyapar Excel export to update stock, prices, and categories.
          </p>
        </div>
        {lastSync && (
          <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border ${
            isSyncStale
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-primary/5 border-primary/20 text-primary'
          }`}>
            {isSyncStale
              ? <AlertTriangle className="h-4 w-4" />
              : <CheckCircle className="h-4 w-4" />}
            <span className="font-medium">Last sync:</span>
            <span>{formatDistanceToNow(new Date(lastSync.syncedAt), { addSuffix: true })}</span>
          </div>
        )}
      </div>

      {/* ── Stale warning ── */}
      {isSyncStale && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <p className="text-sm font-medium">
            {lastSync
              ? '⚠ Inventory not synced recently. Sync 3–4 times per day to keep stock accurate.'
              : '⚠ No inventory sync has been performed yet. Upload your first Vyapar XLSX below.'}
          </p>
        </div>
      )}

      {/* ── Upload Card ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Upload Excel File</CardTitle>
              <p className="text-xs text-muted-foreground">
                Vyapar → Items Report → Export → Excel (.xlsx)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">

          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload XLSX file"
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
              isDragOver
                ? 'border-primary bg-primary/5 scale-[0.99]'
                : 'border-border hover:border-primary/50 hover:bg-muted/20'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="text-left min-w-0">
                  <p className="font-semibold text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                    {xlsxBase64 ? ' — ready to sync' : ' — reading…'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="ml-1 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-7 w-7 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Drop your Vyapar Excel file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse — .xlsx only</p>
                </div>
              </div>
            )}
          </div>

          {/* Sync button */}
          <Button
            onClick={handleSync}
            disabled={!selectedFile || !xlsxBase64 || syncing}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            size="lg"
          >
            {syncing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing inventory…</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" /> Sync Inventory</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Column mapping reference ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Table2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Column Mapping</CardTitle>
              <p className="text-xs text-muted-foreground">
                Vyapar Gold Desktop columns read during sync
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Vyapar Column</th>
                  <th className="px-4 py-2.5 text-left font-medium">Updates</th>
                </tr>
              </thead>
              <tbody>
                {COLUMN_MAP.map(({ vyapar, thinkit }, i) => (
                  <tr key={vyapar} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground">{vyapar}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{thinkit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Sync Summary ── */}
      {lastResult && (
        <Card className="border-primary/30 bg-primary/5 shadow-sm">
          <CardHeader className="pb-0 pt-5 px-5">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold text-primary">
                Inventory Sync Successful
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border border-border rounded-xl bg-card overflow-hidden">
              <Stat value={lastResult.summary.productsUpdated} label="Products Updated" />
              <Stat value={lastResult.summary.newProducts} label="New Products" />
              <Stat value={lastResult.summary.outOfStockCount} label="Out of Stock" highlight="error" />
              <Stat value={lastResult.summary.errorCount} label="Errors" highlight="warn" />
            </div>

            {lastResult.errors.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-800">
                  Error Details (first {lastResult.errors.length}):
                </p>
                {lastResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-amber-700">
                    <span className="font-mono font-semibold">Row {err.row}</span>
                    {' · '}{err.name}{' — '}{err.reason}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Sync History ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Sync History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="flex items-center justify-center p-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading history…</span>
            </div>
          ) : !history?.length ? (
            <div className="p-10 text-center">
              <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No syncs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a Vyapar Excel file above to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Date &amp; Time</th>
                    <th className="px-4 py-3 font-medium text-right">Updated</th>
                    <th className="px-4 py-3 font-medium text-right">OOS</th>
                    <th className="px-4 py-3 font-medium text-right">Errors</th>
                    <th className="px-4 py-3 font-medium">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs max-w-[180px]">
                        <span className="truncate block" title={log.fileName}>{log.fileName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium">
                          {format(new Date(log.syncedAt), 'dd MMM yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.syncedAt), 'hh:mm a')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {log.productsUpdated.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {log.outOfStockCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-destructive/10 text-destructive border-destructive/20 tabular-nums"
                          >
                            {log.outOfStockCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {log.errorCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 tabular-nums"
                          >
                            {log.errorCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.adminUser}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
