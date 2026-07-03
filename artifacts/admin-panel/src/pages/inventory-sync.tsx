import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isAfter, subHours } from 'date-fns';
import {
  Upload, RefreshCw, CheckCircle, AlertTriangle,
  Clock, Package, FileText, X, Loader2, Table2,
  ArrowLeft, Search, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { adminFetch } from '@/lib/admin-fetch';

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchMethod = 'sku' | 'exact' | 'normalized';

interface PreviewRow {
  rowNum: number;
  vyaparName: string;
  vyaparSku: string;
  thinkitName: string | null;
  matchMethod: MatchMethod | null;
  status: 'matched' | 'not_found';
  notFoundReason?: string;
}

interface PreviewResult {
  totalRows: number;
  skippedBlank: number;
  matched: number;
  notFound: number;
  matchedSample: PreviewRow[];
  notFoundRows: PreviewRow[];
}

interface SyncSummary {
  totalRows: number;
  skippedBlank: number;
  productsUpdated: number;
  outOfStockCount: number;
  errorCount: number;
  notFoundCount: number;
}

interface SyncResult {
  success: boolean;
  summary: SyncSummary;
  errors: Array<{ row: number; name: string; reason: string }>;
  notFoundProducts: PreviewRow[];
}

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

type Step = 'upload' | 'preview' | 'result';

// ── Helper components ─────────────────────────────────────────────────────────

function StatBox({
  value, label, sub, highlight,
}: {
  value: number | string;
  label: string;
  sub?: string;
  highlight?: 'error' | 'warn' | 'success';
}) {
  const numVal = typeof value === 'number' ? value : parseInt(String(value), 10);
  const color =
    highlight === 'error' && numVal > 0 ? 'text-destructive' :
    highlight === 'warn'  && numVal > 0 ? 'text-amber-600' :
    highlight === 'success'             ? 'text-primary' :
    'text-foreground';
  return (
    <div className="text-center p-4">
      <p className={`text-3xl font-bold tabular-nums ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function MatchBadge({ method }: { method: MatchMethod | null }) {
  if (!method) return null;
  const cfg: Record<MatchMethod, { label: string; cls: string }> = {
    sku:        { label: 'SKU',        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    exact:      { label: 'Exact name', cls: 'bg-primary/10 text-primary border-primary/20' },
    normalized: { label: 'Fuzzy name', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  };
  const { label, cls } = cfg[method];
  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${cls}`}>{label}</Badge>
  );
}

// ── Column mapping reference ──────────────────────────────────────────────────

const COLUMN_MAP = [
  { vyapar: 'Item name*',             thinkit: 'Product Name (match fallback)' },
  { vyapar: 'Item code',              thinkit: 'SKU / Item Code (match priority 1)' },
  { vyapar: 'Category',               thinkit: 'Category' },
  { vyapar: 'Default Mrp',            thinkit: 'MRP' },
  { vyapar: 'Sale price',             thinkit: 'Selling Price' },
  { vyapar: 'Current stock quantity', thinkit: 'Stock Quantity' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventorySync() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]               = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [xlsxBase64, setXlsxBase64]   = useState('');
  const [previewing, setPreviewing]   = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [syncResult, setSyncResult]   = useState<SyncResult | null>(null);
  const [isDragOver, setIsDragOver]   = useState(false);
  const [showAllUnmatched, setShowAllUnmatched] = useState(false);

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
      toast({ title: 'Invalid file type', description: 'Please upload an Excel (.xlsx) file from Vyapar.', variant: 'destructive' });
      return;
    }
    setXlsxBase64('');
    setSelectedFile(file);
    setPreviewData(null);
    setSyncResult(null);
    setStep('upload');
    setShowAllUnmatched(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setXlsxBase64(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror  = () => { toast({ title: 'File read failed', description: 'Could not read the file. Please try again.', variant: 'destructive' }); clearFile(); };
    reader.onabort  = () => clearFile();
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setXlsxBase64('');
    setPreviewData(null);
    setSyncResult(null);
    setStep('upload');
    setShowAllUnmatched(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  // ── Preview ────────────────────────────────────────────────────────────────

  const handlePreview = async () => {
    if (!selectedFile || !xlsxBase64) return;
    setPreviewing(true);
    try {
      const result: PreviewResult = await adminFetch('/api/admin/inventory-sync/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xlsxBase64, fileName: selectedFile.name }),
      });
      setPreviewData(result);
      setStep('preview');
      setShowAllUnmatched(false);
    } catch (err: unknown) {
      toast({ title: 'Preview failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setPreviewing(false);
    }
  };

  // ── Sync ───────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    if (!selectedFile || !xlsxBase64) return;
    setSyncing(true);
    try {
      const result: SyncResult = await adminFetch('/api/admin/inventory-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xlsxBase64, fileName: selectedFile.name }),
      });
      setSyncResult(result);
      setStep('result');
      qc.invalidateQueries({ queryKey: ['/api/admin/inventory-sync/history'] });
      toast({
        title: 'Inventory sync complete ✓',
        description: `${result.summary.productsUpdated.toLocaleString()} products updated.`,
      });
    } catch (err: unknown) {
      toast({ title: 'Sync failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const resetToUpload = () => {
    clearFile();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory Sync</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a Vyapar Excel export to update stock, prices, and categories.
          </p>
        </div>
        {lastSync && (
          <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border ${
            isSyncStale ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-primary/5 border-primary/20 text-primary'
          }`}>
            {isSyncStale ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <span className="font-medium">Last sync:</span>
            <span>{formatDistanceToNow(new Date(lastSync.syncedAt), { addSuffix: true })}</span>
          </div>
        )}
      </div>

      {/* ── Stale warning ── */}
      {isSyncStale && step === 'upload' && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <p className="text-sm font-medium">
            {lastSync
              ? '⚠ Inventory not synced recently. Sync 3–4 times per day to keep stock accurate.'
              : '⚠ No inventory sync has been performed yet. Upload your first Vyapar XLSX below.'}
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 1 — UPLOAD
      ══════════════════════════════════════════════ */}
      {step === 'upload' && (
        <>
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Upload Excel File</CardTitle>
                  <p className="text-xs text-muted-foreground">Vyapar → Items Report → Export → Excel (.xlsx)</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">

              {/* Dropzone */}
              <div
                role="button" tabIndex={0} aria-label="Upload XLSX file"
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
                  isDragOver ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-border hover:border-primary/50 hover:bg-muted/20'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                        {xlsxBase64 ? ' — ready to preview' : ' — reading…'}
                      </p>
                    </div>
                    <button type="button" aria-label="Remove file"
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="ml-1 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors">
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

              {/* Preview button */}
              <Button
                onClick={handlePreview}
                disabled={!selectedFile || !xlsxBase64 || previewing}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                size="lg"
              >
                {previewing
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analysing file…</>
                  : <><Eye className="mr-2 h-4 w-4" /> Preview Matches</>}
              </Button>
            </CardContent>
          </Card>

          {/* Column mapping reference */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Table2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Column Mapping</CardTitle>
                  <p className="text-xs text-muted-foreground">Vyapar Gold Desktop columns read during sync</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Vyapar Column</th>
                      <th className="px-4 py-2.5 text-left font-medium">Updates in Thinkit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COLUMN_MAP.map(({ vyapar, thinkit }, i) => (
                      <tr key={vyapar} className={`border-b border-border last:border-0 ${i % 2 ? 'bg-muted/20' : ''}`}>
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground">{vyapar}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{thinkit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════
          STEP 2 — PREVIEW
      ══════════════════════════════════════════════ */}
      {step === 'preview' && previewData && (
        <>
          {/* Back + file name */}
          <div className="flex items-center gap-3">
            <button onClick={resetToUpload} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Choose different file
            </button>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm font-medium text-foreground truncate">{selectedFile?.name}</span>
          </div>

          {/* Match summary */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Match Preview</CardTitle>
                <span className="ml-auto text-xs text-muted-foreground">No changes made yet</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-b border-border">
                <StatBox value={previewData.totalRows}   label="Total Rows"       />
                <StatBox value={previewData.matched}     label="Products Matched" highlight="success" />
                <StatBox value={previewData.notFound}    label="Not Found"        highlight={previewData.notFound > 0 ? 'warn' : undefined} />
                <StatBox value={previewData.skippedBlank} label="Blank / Skipped" />
              </div>

              {/* Matched sample */}
              {previewData.matchedSample.length > 0 && (
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Sample Matched Products ({previewData.matched} total)
                  </p>
                  <div className="space-y-2">
                    {previewData.matchedSample.map((r) => (
                      <div key={r.rowNum} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-primary/5 border border-primary/15">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{r.vyaparName}</p>
                          {r.thinkitName !== r.vyaparName && (
                            <p className="text-xs text-muted-foreground">→ {r.thinkitName}</p>
                          )}
                        </div>
                        <MatchBadge method={r.matchMethod} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched products */}
              {previewData.notFoundRows.length > 0 && (
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                      Not Found in Thinkit ({previewData.notFound})
                    </p>
                    {previewData.notFoundRows.length > 10 && (
                      <button
                        onClick={() => setShowAllUnmatched((v) => !v)}
                        className="text-xs text-primary hover:underline"
                      >
                        {showAllUnmatched ? 'Show fewer' : `Show all ${previewData.notFoundRows.length}`}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {(showAllUnmatched ? previewData.notFoundRows : previewData.notFoundRows.slice(0, 10)).map((r) => (
                      <div key={r.rowNum} className="flex items-start gap-3 py-1.5 px-3 rounded-lg bg-amber-50 border border-amber-100">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {r.vyaparName || r.vyaparSku || `Row ${r.rowNum}`}
                          </p>
                          {r.notFoundReason && (
                            <p className="text-xs text-amber-700 mt-0.5">{r.notFoundReason}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-amber-600 font-mono shrink-0">row {r.rowNum}</span>
                      </div>
                    ))}
                  </div>
                  {previewData.matched === 0 && (
                    <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <p className="text-sm font-semibold text-destructive">⚠ No products matched</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Make sure the Vyapar product names match Thinkit product names (case and spacing don't matter).
                        If using Item codes, ensure they are entered in the Thinkit product SKU field.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {previewData.notFoundRows.length === 0 && previewData.matched > 0 && (
                <div className="px-5 py-4 flex items-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">All products matched — ready to sync.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetToUpload} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleSync}
              disabled={syncing || previewData.matched === 0}
              className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              size="lg"
            >
              {syncing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing inventory…</>
                : <><RefreshCw className="mr-2 h-4 w-4" /> Confirm &amp; Sync {previewData.matched.toLocaleString()} Products</>}
            </Button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════
          STEP 3 — RESULT
      ══════════════════════════════════════════════ */}
      {step === 'result' && syncResult && (
        <>
          <Card className="border-primary/30 bg-primary/5 shadow-sm">
            <CardHeader className="pb-0 pt-5 px-5">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold text-primary">Inventory Sync Complete</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Detailed stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-border border border-border rounded-xl bg-card overflow-hidden">
                <StatBox value={syncResult.summary.totalRows}        label="Total Rows"      />
                <StatBox value={syncResult.summary.productsUpdated}  label="Updated"         highlight="success" />
                <StatBox value={syncResult.summary.outOfStockCount}  label="Out of Stock"    highlight={syncResult.summary.outOfStockCount > 0 ? 'error' : undefined} />
                <StatBox value={syncResult.summary.notFoundCount}    label="Not Found"       highlight={syncResult.summary.notFoundCount > 0 ? 'warn' : undefined} />
                <StatBox value={syncResult.summary.errorCount}       label="Errors"          highlight={syncResult.summary.errorCount > 0 ? 'warn' : undefined} />
                <StatBox value={syncResult.summary.skippedBlank}     label="Blank Rows"      />
              </div>

              {/* Row errors */}
              {syncResult.errors.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800">Row Errors (first {syncResult.errors.length}):</p>
                  {syncResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">
                      <span className="font-mono font-semibold">Row {e.row}</span> · {e.name} — {e.reason}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unmatched report */}
          {syncResult.notFoundProducts.length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader className="py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <CardTitle className="text-base font-semibold">
                      Products Not Found ({syncResult.summary.notFoundCount})
                    </CardTitle>
                  </div>
                  {syncResult.notFoundProducts.length > 10 && (
                    <button onClick={() => setShowAllUnmatched((v) => !v)}
                      className="text-xs text-primary hover:underline">
                      {showAllUnmatched ? 'Show fewer' : `Show all ${syncResult.notFoundProducts.length}`}
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">Row</th>
                        <th className="px-4 py-3 font-medium">Vyapar Product</th>
                        <th className="px-4 py-3 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllUnmatched ? syncResult.notFoundProducts : syncResult.notFoundProducts.slice(0, 10)).map((r) => (
                        <tr key={r.rowNum} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.rowNum}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-foreground">{r.vyaparName || '—'}</p>
                            {r.vyaparSku && <p className="text-xs text-muted-foreground font-mono">SKU: {r.vyaparSku}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-amber-700">{r.notFoundReason ?? 'Not in Thinkit'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={resetToUpload} className="w-full">
            <Upload className="mr-2 h-4 w-4" /> Sync Another File
          </Button>
        </>
      )}

      {/* ── Sync History (always visible) ────────────────────────────────────── */}
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
              <p className="text-xs text-muted-foreground mt-1">Upload a Vyapar Excel file above to get started.</p>
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
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs max-w-[180px]">
                        <span className="truncate block" title={log.fileName}>{log.fileName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium">{format(new Date(log.syncedAt), 'dd MMM yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(log.syncedAt), 'hh:mm a')}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{log.productsUpdated.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {log.outOfStockCount > 0
                          ? <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 tabular-nums">{log.outOfStockCount}</Badge>
                          : <span className="text-muted-foreground text-xs">0</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {log.errorCount > 0
                          ? <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 tabular-nums">{log.errorCount}</Badge>
                          : <span className="text-muted-foreground text-xs">0</span>}
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
