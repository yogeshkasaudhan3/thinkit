import { useState } from 'react';
import { useLocation } from 'wouter';
import { useBulkImportProducts } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, FileType, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Simplified schema just for parsing CSV cleanly
const csvRowSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  categoryId: z.string().min(1),
  weight: z.string().min(1),
  mrp: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  stockQty: z.coerce.number().optional().default(100),
  inStock: z.union([z.boolean(), z.string()]).transform(val => 
    typeof val === 'string' ? val.toLowerCase() !== 'false' : val
  ).optional().default(true),
  enabled: z.union([z.boolean(), z.string()]).transform(val => 
    typeof val === 'string' ? val.toLowerCase() !== 'false' : val
  ).optional().default(true),
});

export default function BulkImport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: bulkImport, isPending } = useBulkImportProducts();
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errors, setErrors] = useState<{row: number, error: string}[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<{imported: number, updated: number, failed: number, errors: string[]} | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({ title: 'Invalid file type', description: 'Please select a CSV file.', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
      setParsedData([]);
      setErrors([]);
      setImportResult(null);
    }
  };

  const parseCsv = () => {
    if (!file) return;
    setIsParsing(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validRows: any[] = [];
        const rowErrors: {row: number, error: string}[] = [];
        
        results.data.forEach((row: any, index) => {
          try {
            // Clean up keys (remove spaces)
            const cleanRow = Object.keys(row).reduce((acc, key) => {
              acc[key.trim()] = row[key];
              return acc;
            }, {} as any);
            
            const validated = csvRowSchema.parse(cleanRow);
            validRows.push(validated);
          } catch (err: any) {
            rowErrors.push({
              row: index + 2, // +2 because 1-indexed and header row
              error: err.issues?.[0]?.message || 'Invalid format'
            });
          }
        });
        
        setParsedData(validRows);
        setErrors(rowErrors);
        setIsParsing(false);
      },
      error: (error) => {
        toast({ title: 'Error parsing CSV', description: error.message, variant: 'destructive' });
        setIsParsing(false);
      }
    });
  };

  const handleImport = () => {
    if (parsedData.length === 0) return;
    
    bulkImport({ data: { products: parsedData } }, {
      onSuccess: (result) => {
        setImportResult(result);
        queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
        toast({ title: 'Import complete' });
      },
      onError: (err: any) => {
        toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
      }
    });
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setImportResult(null);
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/products')} className="shrink-0 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex-1">
          Bulk Import Products
        </h1>
      </div>

      {!importResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload CSV</CardTitle>
                <CardDescription>
                  Upload a CSV file to create or update multiple products at once.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input 
                    id="csv-upload" 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-semibold mb-2">Required Columns:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="bg-background">name</Badge>
                    <Badge variant="outline" className="bg-background">brand</Badge>
                    <Badge variant="outline" className="bg-background">categoryId</Badge>
                    <Badge variant="outline" className="bg-background">weight</Badge>
                    <Badge variant="outline" className="bg-background">mrp</Badge>
                    <Badge variant="outline" className="bg-background">price</Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button 
                  onClick={parseCsv} 
                  disabled={!file || isParsing} 
                  className="w-full"
                >
                  {isParsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileType className="h-4 w-4 mr-2" />}
                  Parse CSV
                </Button>
                {parsedData.length > 0 && (
                  <Button 
                    onClick={handleImport} 
                    disabled={isPending} 
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Import {parsedData.length} Products
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-4">
                <CardTitle className="text-lg flex justify-between items-center">
                  Preview
                  {parsedData.length > 0 && (
                    <Badge variant="secondary">{parsedData.length} valid rows</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                {!file && parsedData.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground min-h-[300px]">
                    <Upload className="h-10 w-10 mb-4 opacity-50" />
                    <p>Select and parse a CSV file to see preview</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto max-h-[500px]">
                    {errors.length > 0 && (
                      <div className="bg-destructive/10 text-destructive p-4 border-b border-destructive/20 text-sm">
                        <div className="font-semibold flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4" /> 
                          {errors.length} rows had errors and will be skipped
                        </div>
                        <ul className="list-disc pl-5 space-y-1 max-h-32 overflow-auto">
                          {errors.map((e, i) => (
                            <li key={i}>Row {e.row}: {e.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {parsedData.length > 0 && (
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 border-b border-border shadow-sm">
                          <tr>
                            <th className="px-4 py-2 font-medium">Name</th>
                            <th className="px-4 py-2 font-medium">Brand</th>
                            <th className="px-4 py-2 font-medium">Category</th>
                            <th className="px-4 py-2 font-medium text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {parsedData.slice(0, 100).map((row, i) => (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className="px-4 py-2 font-medium truncate max-w-[200px]">{row.name}</td>
                              <td className="px-4 py-2 text-muted-foreground">{row.brand}</td>
                              <td className="px-4 py-2 text-xs truncate max-w-[150px]">{row.categoryId}</td>
                              <td className="px-4 py-2 text-right">
                                <div>₹{row.price}</div>
                                {row.mrp > row.price && <div className="text-[10px] text-muted-foreground line-through">₹{row.mrp}</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {parsedData.length > 100 && (
                      <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20">
                        Showing first 100 of {parsedData.length} valid rows
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="max-w-2xl mx-auto border-primary/20 shadow-md">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Import Completed</CardTitle>
            <CardDescription className="text-base mt-2">
              Successfully processed your CSV file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-muted p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-foreground">{importResult.imported}</div>
                <div className="text-sm font-medium text-muted-foreground uppercase mt-1">Created</div>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-foreground">{importResult.updated}</div>
                <div className="text-sm font-medium text-muted-foreground uppercase mt-1">Updated</div>
              </div>
              <div className="bg-destructive/10 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-destructive">{importResult.failed}</div>
                <div className="text-sm font-medium text-destructive/80 uppercase mt-1">Failed</div>
              </div>
            </div>
            
            {importResult.errors?.length > 0 && (
              <div className="bg-muted p-4 rounded-md text-sm border border-border">
                <h4 className="font-semibold mb-2">Errors:</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground max-h-40 overflow-auto">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center gap-4 pb-8">
            <Button variant="outline" onClick={reset}>Import Another</Button>
            <Button onClick={() => setLocation('/products')}>View Products</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
