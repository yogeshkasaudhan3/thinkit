import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, CheckCircle, AlertTriangle,
  Loader2, X, ArrowLeft, Package, Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreviewRow {
  rowNum: number;
  name: string;
  brand: string;
  category: string;
  mrp: number;
  price: number;
  stockQty: number;
  barcode: string;
}

interface PreviewResult {
  totalRows: number;
  skippedBlank: number;
  skippedNoPrice: number;
  uniqueCategories: number;
  categoryNames: string[];
  sample: PreviewRow[];
}

interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  skippedBlank: number;
  skippedNoPrice: number;
  totalProcessed: number;
  categoriesCreated: number;
  errors: string[];
}

type Step = 'upload' | 'preview' | 'result';

// ── API fetch helper ──────────────────────────────────────────────────────────

const apiFetch = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error((d as { error?: string }).error ?? `HTTP ${r.status}`);
    return d;
  });

// ── Stat box ──────────────────────────────────────────────────────────────────

function StatBox({
  value, label, highlight,
}: {
  value: number;
  label: string;
  highlight?: 'success' | 'warn' | 'error';
}) {
  const color =
    highlight === 'error'   && value > 0 ? 'text-destructive' :
    highlight === 'warn'    && value > 0 ? 'text-amber-600'   :
    highlight === 'success'              ? 'text-primary'      :
    'text-foreground';
  return (
    <div className="text-center p-4">
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BulkImport() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]             = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting]   = useState(false);

  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ── File handling ──────────────────────────────────────────────────────────

  const ACCEPTED_EXTS = ['csv', 'xlsx'];

  const loadFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_EXTS.includes(ext)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV (.csv) or Excel (.xlsx) file exported from Vyapar.',
        variant: 'destructive',
      });
      return;
    }

    setFileBase64('');
    setSelectedFile(file);
    setPreviewData(null);
    setImportResult(null);
    setStep('upload');

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFileBase64(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = () => {
      toast({ title: 'File read failed', description: 'Could not read the file.', variant: 'destructive' });
      clearFile();
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileBase64('');
    setPreviewData(null);
    setImportResult(null);
    setStep('upload');
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
    if (!selectedFile || !fileBase64) return;
    setPreviewing(true);
    try {
      const result: PreviewResult = await apiFetch(
        '/api/admin/products/vyapar-import/preview',
        { fileBase64, fileName: selectedFile.name }
      );
      setPreviewData(result);
      setStep('preview');
    } catch (err: unknown) {
      toast({
        title: 'Preview failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPreviewing(false);
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!selectedFile || !fileBase64) return;
    setImporting(true);
    try {
      const result: ImportResult = await apiFetch(
        '/api/admin/products/vyapar-import',
        { fileBase64, fileName: selectedFile.name }
      );
      setImportResult(result);
      setStep('result');
      qc.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({
        title: 'Import complete ✓',
        description: `${result.created} created, ${result.updated} updated.`,
      });
    } catch (err: unknown) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation('/products')}
          className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          aria-label="Back to products"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Bulk Import Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload a Vyapar export to create or update 1,700+ products automatically.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          STEP 1 — UPLOAD
      ══════════════════════════════════════════════ */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — upload card */}
          <Card className="lg:col-span-1 border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Upload File</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">

              {/* Dropzone */}
              <div
                role="button" tabIndex={0} aria-label="Upload file"
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all select-none ${
                  isDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/20'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
                />

                {selectedFile ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-7 w-7 text-primary shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                        {fileBase64 ? ' — ready' : ' — reading…'}
                      </p>
                    </div>
                    <button
                      type="button" aria-label="Remove file"
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="p-1 rounded-full hover:bg-muted text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                    <p className="text-sm font-medium text-foreground">Drop your Vyapar file here</p>
                    <p className="text-xs text-muted-foreground">CSV or Excel (.xlsx) — click to browse</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handlePreview}
                disabled={!selectedFile || !fileBase64 || previewing}
                className="w-full"
                size="lg"
              >
                {previewing
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing file…</>
                  : <><FileText className="mr-2 h-4 w-4" />Preview Products</>}
              </Button>
            </CardContent>
          </Card>

          {/* Right — how it works */}
          <Card className="lg:col-span-2 border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-muted/30">
              <CardTitle className="text-base font-semibold">Column Mapping (Vyapar → Thinkit)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Vyapar Column</th>
                    <th className="px-4 py-2.5 text-left font-medium">Maps To</th>
                    <th className="px-4 py-2.5 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { from: 'Item name*',             to: 'Product Name',      note: 'Used to match existing products' },
                    { from: 'Item code',               to: 'Barcode / SKU',    note: 'Match priority over name' },
                    { from: 'Company',                 to: 'Brand',            note: 'Blank if column absent' },
                    { from: 'Category',                to: 'Category',         note: 'Auto-created if not found' },
                    { from: 'Default Mrp',             to: 'MRP',              note: '' },
                    { from: 'Sale price',              to: 'Selling Price',    note: 'Falls back to MRP if blank' },
                    { from: 'Current stock quantity',  to: 'Stock',            note: 'Sets in-stock status' },
                  ].map(({ from, to, note }, i) => (
                    <tr key={from} className={`border-b border-border last:border-0 ${i % 2 ? 'bg-muted/20' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-xs text-foreground">{from}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{to}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-4 py-4 border-t border-border bg-muted/10">
                <p className="text-xs font-semibold text-foreground mb-2">How import works:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <span className="font-medium text-foreground">Existing products</span> — matched by Item code first, then by name (fuzzy). Stock, price &amp; category are updated.</li>
                  <li>• <span className="font-medium text-foreground">New products</span> — created automatically. Images can be added later from the Products page.</li>
                  <li>• <span className="font-medium text-foreground">Categories</span> — auto-created if a category name is not yet in Thinkit.</li>
                  <li>• <span className="font-medium text-foreground">Blank / separator rows</span> — skipped safely.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 2 — PREVIEW
      ══════════════════════════════════════════════ */}
      {step === 'preview' && previewData && (
        <>
          {/* File name breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setStep('upload')} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Choose different file
            </button>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-foreground truncate">{selectedFile?.name}</span>
          </div>

          {/* Summary stats */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-0 border-b border-border bg-muted/30">
              <CardTitle className="text-base font-semibold py-1">Ready to Import</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                <StatBox value={previewData.totalRows}        label="Products"          highlight="success" />
                <StatBox value={previewData.uniqueCategories} label="Categories"                            />
                <StatBox value={previewData.skippedBlank}     label="Skipped"                               />
              </div>

              {/* Category names */}
              {previewData.categoryNames.length > 0 && (
                <div className="px-5 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    <Tag className="h-3 w-3 inline mr-1" />
                    Categories ({previewData.uniqueCategories}
                    {previewData.uniqueCategories > previewData.categoryNames.length ? ` — showing first ${previewData.categoryNames.length}` : ''})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewData.categoryNames.map((c) => (
                      <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample rows table */}
              {previewData.sample.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="px-5 pt-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Sample ({Math.min(previewData.sample.length, 50)} of {previewData.totalRows} rows)
                  </p>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-y border-border">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium">Product Name</th>
                        <th className="px-4 py-2.5 text-left font-medium">Brand</th>
                        <th className="px-4 py-2.5 text-left font-medium">Category</th>
                        <th className="px-4 py-2.5 text-right font-medium">MRP</th>
                        <th className="px-4 py-2.5 text-right font-medium">Price</th>
                        <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewData.sample.map((row) => (
                        <tr key={row.rowNum} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-medium text-foreground max-w-[200px]">
                            <div className="truncate" title={row.name}>{row.name}</div>
                            {row.barcode && (
                              <div className="text-[10px] text-muted-foreground font-mono">{row.barcode}</div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.brand || '—'}</td>
                          <td className="px-4 py-2.5 text-xs">
                            {row.category
                              ? <Badge variant="outline" className="text-[10px]">{row.category}</Badge>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                            {row.mrp > 0 ? `₹${row.mrp}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            {row.price > 0 ? `₹${row.price}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{row.stockQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.totalRows > 50 && (
                    <p className="px-4 py-3 text-center text-xs text-muted-foreground border-t border-border">
                      Showing first 50 of {previewData.totalRows} products
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || previewData.totalRows === 0}
              className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              size="lg"
            >
              {importing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</>
                : <><Upload className="mr-2 h-4 w-4" />Import {previewData.totalRows.toLocaleString()} Products</>}
            </Button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════
          STEP 3 — RESULT
      ══════════════════════════════════════════════ */}
      {step === 'result' && importResult && (
        <>
          <Card className="border-primary/30 bg-primary/5 shadow-sm">
            <CardHeader className="pb-0 pt-5 px-5">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold text-primary">Import Complete</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-border border border-border rounded-xl bg-card overflow-hidden">
                <StatBox value={importResult.totalProcessed}    label="Processed"  />
                <StatBox value={importResult.created}           label="Created"    highlight="success" />
                <StatBox value={importResult.updated}           label="Updated"    />
                <StatBox value={importResult.categoriesCreated} label="New Cats"   />
                <StatBox value={importResult.failed}            label="Failed"     highlight={importResult.failed > 0 ? 'error' : undefined} />
                <StatBox value={importResult.skippedBlank}      label="Skipped"    />
              </div>

              {importResult.errors.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Errors ({importResult.errors.length}{importResult.errors.length >= 50 ? '+' : ''}):
                  </p>
                  <ul className="text-xs text-amber-700 space-y-0.5 max-h-40 overflow-y-auto pl-1">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={clearFile} className="flex-1">
              <Upload className="mr-2 h-4 w-4" /> Import Another File
            </Button>
            <Button onClick={() => setLocation('/products')} className="flex-1">
              <Package className="mr-2 h-4 w-4" /> View Products
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
