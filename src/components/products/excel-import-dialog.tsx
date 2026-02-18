"use client"

import * as React from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileUp, Download, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { importProducts } from "@/actions/inventory/bulk-import-action"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface ExcelImportDialogProps {
    stores: { id: string, name: string }[]
    onSuccess?: () => void
}

export function ExcelImportDialog({ stores, onSuccess }: ExcelImportDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [file, setFile] = React.useState<File | null>(null)
    const [previewData, setPreviewData] = React.useState<any[]>([])
    const [isUploading, setIsUploading] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Handle Template Download
    const downloadTemplate = () => {
        const header = {
            "Model Adı": "Örn: Slim Fit Gömlek",
            "Model Kodu": "Örn: GR10450 (Opsiyonel)", // Optional Model Code
            "Marka": "Örn: Zara",
            "Kategori": "Giyim",
            "Sezon": "2024 Yaz",
            "Renk": "Kırmızı",
            "Beden": "M",
            "SKU": "ZAR-GOM-KIR-M",
            "Barkod": "8691234567890",
            "Alış Fiyatı": 100,
            "Satış Fiyatı": 250,
        };

        // Add Store Columns
        const storeColumns: any = {};
        stores.forEach(s => {
            storeColumns[s.name] = 10;
        });

        const row = { ...header, ...storeColumns };

        const worksheet = XLSX.utils.json_to_sheet([row]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sablon");

        // Column Widths
        const wscols = Object.keys(row).map(k => ({ wch: 20 }));
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, "Urun_Yukleme_Sablonu.xlsx");
    }

    // Handle File Upload & Parse
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsUploading(true); // Loading state on

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const buffer = evt.target?.result;
                const wb = XLSX.read(buffer, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });

                // Key Normalization (Trim spaces from headers)
                const data = rawData.map((row: any) => {
                    const newRow: any = {};
                    Object.keys(row).forEach(k => {
                        newRow[k.trim()] = row[k];
                    });
                    return newRow;
                });

                setPreviewData(data);

                if (data.length === 0) toast.error("Dosya boş görünüyor.");

            } catch (err) {
                console.error(err);
                toast.error("Dosya okunamadı. Lütfen geçerli bir Excel dosyası yükleyin.");
                setFile(null);
            } finally {
                setIsUploading(false); // Loading state off
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    }

    // Handle Publish
    const handlePublish = async () => {
        if (!previewData || previewData.length === 0) return;

        setIsUploading(true);
        const result = await importProducts(previewData, stores);
        setIsUploading(false);

        if (result.success) {
            toast.success(result.message, { duration: 10000 });
            setOpen(false);
            setFile(null);
            setPreviewData([]);
            if (onSuccess) onSuccess();
        } else {
            toast.error(result.error);
        }
    }

    // Safe render helper for cells
    const renderCell = (val: any) => {
        if (val === null || val === undefined) return "";
        if (typeof val === 'object') {
            if (val instanceof Date) return val.toLocaleDateString();
            return JSON.stringify(val); // Fallback for other objects
        }
        return String(val);
    }

    // ... (previous code)

    // ... (previous code)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50">
                    <FileUp className="w-3 h-3 mr-1" /> Excel'den Yükle
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle>Toplu Ürün Yükle</DialogTitle>
                    {/* Hidden Test Button for User Request */}

                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
                    {/* ... (rest of UI) */}
                    {/* Step 1: Prepare & Upload */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 border rounded-lg shrink-0">
                        <div className="flex-1 space-y-1">
                            <h4 className="text-sm font-semibold">1. Adım: Şablonu Hazırla</h4>
                            <p className="text-xs text-muted-foreground">Mağazalarınıza uygun sütunların olduğu şablonu indirin ve doldurun.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadTemplate}>
                            <Download className="mr-2 h-4 w-4" /> Şablon İndir
                        </Button>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-gray-50 border rounded-lg shrink-0">
                        <div className="flex-1 space-y-1">
                            <h4 className="text-sm font-semibold">2. Adım: Dosyayı Yükle</h4>
                            <p className="text-xs text-muted-foreground">Hazırladığınız Excel dosyasını seçin.</p>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="file"
                                accept=".xlsx, .xls"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="w-[250px] bg-white cursor-pointer file:cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Step 2: Preview */}
                    {previewData.length > 0 && (
                        <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
                            <div className="p-2 bg-indigo-50 border-b text-xs font-semibold text-indigo-700 flex justify-between items-center">
                                <span>Önizleme ({previewData.length} Kayıt)</span>
                                <span className="text-[10px] text-indigo-500 font-normal">* İlk 50 kayıt gösteriliyor</span>
                            </div>
                            <div className="flex-1 overflow-auto bg-white">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="sticky top-0 bg-gray-100 z-10">
                                            {Object.keys(previewData[0] || {}).map((header) => (
                                                <TableHead key={header} className="whitespace-nowrap h-8 py-1 text-xs">{header}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.slice(0, 50).map((row, i) => (
                                            <TableRow key={i} className="hover:bg-gray-50 h-8">
                                                {Object.values(row).map((val: any, j) => (
                                                    <TableCell key={j} className="text-xs py-1 whitespace-nowrap">
                                                        {renderCell(val)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                    {/* Add loading spinner here if actively uploading but no preview yet? Or just button state? */}
                    {isUploading && previewData.length === 0 && (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-indigo-600" /></div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
                    <Button
                        onClick={handlePublish}
                        disabled={previewData.length === 0 || isUploading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isUploading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</>
                        ) : (
                            <><CheckCircle2 className="mr-2 h-4 w-4" /> Yayına Al ({previewData.length})</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
