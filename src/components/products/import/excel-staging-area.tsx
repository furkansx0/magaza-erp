"use client"

import * as React from "react"
import * as XLSX from "xlsx"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    ColumnDef,
} from "@tanstack/react-table"
import { 
    X, 
    FileUp, 
    Download, 
    CheckCircle2, 
    AlertCircle, 
    Trash2, 
    Loader2, 
    BarChart3,
    ArrowLeft,
    Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { runSmartImport, SmartImportRow } from "@/actions/inventory/bulk-import-action"
import { toast } from "sonner"

interface ExcelStagingAreaProps {
    isOpen: boolean;
    onClose: () => void;
    stores: { id: string, name: string }[];
}

export function ExcelStagingArea({ isOpen, onClose, stores }: ExcelStagingAreaProps) {
    const [data, setData] = React.useState<any[]>([])
    const [isProcessing, setIsProcessing] = React.useState(false)
    const [validationReport, setValidationReport] = React.useState<{ errors: number, warnings: number }>({ errors: 0, warnings: 0 })
    
    const parentRef = React.useRef<HTMLDivElement>(null)

    // 1. Template Download
    const downloadTemplate = () => {
        const header = [
            "Cinsiyet", "Mevsim", "Ana Kategori", "Alt Kategori", "Model Kodu", 
            "Model Adı", "Marka", "Renk", "Beden", "Barkod", 
            "Alış Fiyatı", "Satış Fiyatı", "İşlem Tipi"
        ];
        stores.forEach(s => header.push(s.name));

        const dummyRow = [
            "Erkek", "Yazlık", "Ayakkabı", "Spor Ayakkabı", "GR10450", 
            "Comfort Step", "Nike", "Siyah", "42", "8691234567890", 
            "1200", "2500", "EKLE"
        ];
        stores.forEach(() => dummyRow.push("10"));

        const ws = XLSX.utils.aoa_to_sheet([header, dummyRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Urun_Sablonu");
        XLSX.writeFile(wb, "Smart_Retail_Import_Template.xlsx");
    }

    // 2. File Upload & Parse
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const buffer = evt.target?.result;
            const wb = XLSX.read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });
            
            // Clean keys
            const cleanedData = rawData.map((row: any) => {
                const newRow: any = {};
                Object.keys(row).forEach(k => {
                    newRow[k.trim()] = row[k];
                });
                return newRow;
            });

            setData(cleanedData);
            validateData(cleanedData);
        };
        reader.readAsArrayBuffer(file);
    }

    // 3. Validation Logic
    const validateData = (rows: any[]) => {
        let errCount = 0;
        let warnCount = 0;
        
        rows.forEach(r => {
            if (!r["Model Kodu"] || !r["Cinsiyet"] || !r["Ana Kategori"]) errCount++;
            if (isNaN(Number(r["Alış Fiyatı"])) || isNaN(Number(r["Satış Fiyatı"]))) warnCount++;
        });

        setValidationReport({ errors: errCount, warnings: warnCount });
    }

    // 4. Table Columns
    const columns = React.useMemo<ColumnDef<any>[]>(() => {
        const base: ColumnDef<any>[] = [
            {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteRow(row.index)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                ),
            },
            { accessorKey: "Cinsiyet", header: "Cinsiyet" },
            { accessorKey: "Mevsim", header: "Mevsim" },
            { accessorKey: "Ana Kategori", header: "Ana Kategori" },
            { accessorKey: "Alt Kategori", header: "Alt Kategori" },
            { accessorKey: "Model Kodu", header: "Model Kodu" },
            { accessorKey: "Model Adı", header: "Model Adı" },
            { accessorKey: "Marka", header: "Marka" },
            { accessorKey: "Renk", header: "Renk" },
            { accessorKey: "Beden", header: "Beden" },
            { accessorKey: "Barkod", header: "Barkod" },
            { accessorKey: "Alış Fiyatı", header: "Alış" },
            { accessorKey: "Satış Fiyatı", header: "Satış" },
            { 
                accessorKey: "İşlem Tipi", 
                header: "Tip",
                cell: ({ getValue, row }) => (
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        getValue() === "EKLE" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                        {(getValue() || "EKLE") as React.ReactNode}
                    </span>
                )
            },
        ];

        stores.forEach(s => {
            base.push({
                accessorKey: s.name,
                header: s.name,
                cell: ({ getValue }) => <span className="font-mono">{(getValue() || 0) as React.ReactNode}</span>
            });
        });

        return base;
    }, [stores]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40,
        overscan: 10,
    });

    // Sub-actions
    const handleDeleteRow = (index: number) => {
        const newData = [...data];
        newData.splice(index, 1);
        setData(newData);
        validateData(newData);
    }

    const handleImport = async () => {
        if (validationReport.errors > 0) {
            toast.error("Hatalı satırlar varken içe aktarma yapılamaz. Lütfen Excel dosyanızı düzeltip tekrar yükleyin.");
            return;
        }

        setIsProcessing(true);
        try {
            // Map staging data to SmartImportRow format
            const formattedRows: SmartImportRow[] = data.map(r => ({
                gender: String(r["Cinsiyet"] || "Unisex"),
                season: String(r["Mevsim"] || "4 Mevsim"),
                category: String(r["Ana Kategori"] || "Genel"),
                subCategory: String(r["Alt Kategori"] || "Genel"),
                modelCode: String(r["Model Kodu"]),
                modelName: String(r["Model Adı"]),
                brand: r["Marka"] ? String(r["Marka"]) : undefined,
                color: String(r["Renk"] || "-"),
                size: String(r["Beden"] || "-"),
                barcode: r["Barkod"] ? String(r["Barkod"]) : undefined,
                purchasePrice: Number(r["Alış Fiyatı"]) || 0,
                salePrice: Number(r["Satış Fiyatı"]) || 0,
                operationType: (r["İşlem Tipi"] === "GÜNCELLE" ? "GÜNCELLE" : "EKLE"),
                stocks: stores.reduce((acc, s) => {
                    acc[s.name] = Number(r[s.name]) || 0;
                    return acc;
                }, {} as Record<string, number>)
            }));

            const report = await runSmartImport(formattedRows, stores);
            
            if (report.success) {
                toast.success(`İşlem Tamamlandı: ${report.summary.totalRows} satır işlendi.`);
                onClose();
            } else {
                toast.error(report.logs[0]?.message || "İçe aktarım başarısız.");
            }
        } catch (err: any) {
            toast.error("Hata: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header Area */}
            <header className="h-16 border-b flex items-center justify-between px-6 bg-gray-50/50 grow-0 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">Excel Staging Area</h1>
                        <p className="text-xs text-muted-foreground font-medium">Retail Engine v4.0 • Akıllı İçe Aktarım</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-2" /> Şablon
                    </Button>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".xlsx,.xls" 
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Button variant="secondary" size="sm" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100">
                            <FileUp className="h-4 w-4 mr-2" /> Dosya Seç
                        </Button>
                    </div>
                    <div className="h-6 w-px bg-gray-200 mx-1" />
                    <Button 
                        size="sm" 
                        onClick={handleImport} 
                        disabled={data.length === 0 || isProcessing}
                        className="bg-black hover:bg-zinc-800 text-white shadow-lg"
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        İşlemi Tamamla
                    </Button>
                </div>
            </header>

            {/* Analysis Bar */}
            <div className="h-20 border-b bg-white flex items-center px-6 gap-8 grow-0 shrink-0">
                <div className="flex items-center gap-3 pr-8 border-r">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-xl font-black">{data.length}</div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Toplam Satır</div>
                    </div>
                </div>

                <div className="flex gap-12">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold uppercase tracking-wider">Hatasız</span>
                        </div>
                        <div className="text-lg font-bold">{data.length - validationReport.errors}</div>
                    </div>

                    <div className={cn("flex flex-col", validationReport.errors > 0 ? "text-red-600" : "text-gray-400")}>
                        <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold uppercase tracking-wider">Kritik Hata</span>
                        </div>
                        <div className="text-lg font-bold">{validationReport.errors}</div>
                    </div>
                    
                    {validationReport.errors > 0 && (
                        <div className="flex items-center self-center px-4 py-2 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-xs font-medium text-red-600">
                                <b>Dikkat:</b> {validationReport.errors} satırda temel bilgiler (Model Kodu, Cinsiyet vb.) eksik. 
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Table Area */}
            <main className="flex-1 overflow-hidden relative bg-zinc-100">
                {data.length > 0 ? (
                    <div ref={parentRef} className="h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300">
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            <table className="w-full border-collapse bg-white table-fixed">
                                <thead className="sticky top-0 z-20 bg-white ring-1 ring-gray-200">
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <th 
                                                    key={header.id} 
                                                    className="h-10 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-r last:border-r-0 bg-gray-50/50"
                                                    style={{ width: header.getSize() }}
                                                >
                                                    {header.isPlaceholder ? null : (flexRender(header.column.columnDef.header, header.getContext()) as React.ReactNode)}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {rowVirtualizer.getVirtualItems().map(virtualRow => {
                                        const row = rows[virtualRow.index];
                                        return (
                                            <tr 
                                                key={row.id} 
                                                className="hover:bg-blue-50/30 transition-colors group"
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: `${virtualRow.size}px`,
                                                    transform: `translateY(${virtualRow.start}px)`,
                                                }}
                                            >
                                                {row.getVisibleCells().map(cell => (
                                                    <td 
                                                        key={cell.id} 
                                                        className="px-3 border-b border-r last:border-r-0 text-xs overflow-hidden text-ellipsis whitespace-nowrap"
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext()) as React.ReactNode}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 p-12 text-center">
                        <div className="h-20 w-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-zinc-400">
                            <FileUp className="h-10 w-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Dosya Yüklenmedi</h3>
                            <p className="text-sm text-gray-500 max-w-sm mt-1">İşleme başlamak için sağ üstten Excel dosyanızı seçin veya şablonu indirin.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer Status */}
            <footer className="h-8 border-t bg-gray-100 flex items-center px-4 justify-between grow-0 shrink-0">
                <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Staging Status: {data.length > 0 ? 'Data Loaded' : 'Idle'}</span>
                    <span className="h-3 w-px bg-gray-300" />
                    <span>Memory Usage: Optimized (Virtualized)</span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">Retail ERP Engine v4.0.1</div>
            </footer>
        </div>
    )
}
