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
            "Marka", "Cinsiyet", "Mevsim", "Sezon/Yıl", "Ana Kategori", "Alt Kategori", 
            "Model Kodu", "Renk", "Beden", "Barkod", "SKU",
            "Alış Fiyatı", "Satış Fiyatı", "İşlem Tipi"
        ];
        stores.forEach(s => header.push(s.name));

        const dummyRow = [
            "Nike", "Erkek", "Yazlık", "2024 Yaz", "Ayakkabı", "Spor Ayakkabı", 
            "GR10450", "Siyah", "42", "8691234567890", "GR10450-BLK-42",
            "1200", "2500", "EKLE"
        ];
        stores.forEach(() => dummyRow.push("10"));

        const ws = XLSX.utils.aoa_to_sheet([header, dummyRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Urun_Sablonu");
        XLSX.writeFile(wb, "Smart_Retail_Flat_Import.xlsx");
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
            const cleanedData = rawData.map((row: any, index: number) => {
                const newRow: any = {};
                Object.keys(row).forEach(k => {
                    newRow[k.trim()] = row[k];
                });
                newRow["__id"] = `row-${index}`; // Stable traceable ID from original import
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
            if (!r["Model Kodu"] || !r["Renk"] || !r["Beden"]) errCount++;
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
                size: 40,
                cell: ({ row }) => (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteRow(row.original.__id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                ),
            },
            { accessorKey: "Marka", header: "Marka", size: 100 },
            { accessorKey: "Cinsiyet", header: "Cinsiyet", size: 90 },
            { accessorKey: "Mevsim", header: "Mevsim", size: 90 },
            { accessorKey: "Sezon/Yıl", header: "Sezon", size: 100 },
            { accessorKey: "Ana Kategori", header: "Ana Kat.", size: 120 },
            { accessorKey: "Alt Kategori", header: "Alt Kat.", size: 130 },
            { accessorKey: "Model Kodu", header: "Model", size: 120 },
            { accessorKey: "Renk", header: "Renk", size: 100 },
            { accessorKey: "Beden", header: "Beden", size: 70 },
            { accessorKey: "Barkod", header: "Barkod", size: 140 },
            { accessorKey: "SKU", header: "SKU", size: 140 },
            { accessorKey: "Alış Fiyatı", header: "Alış", size: 90 },
            { accessorKey: "Satış Fiyatı", header: "Satış", size: 90 },
            { 
                accessorKey: "İşlem Tipi", 
                header: "Tip",
                size: 80,
                cell: ({ getValue }) => (
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
        getRowId: (row) => row.__id,
        meta: {
            updateData: (rowIndex: number, columnId: string, value: any) => {
                setData(old =>
                    old.map((row, index) => {
                        if (index === rowIndex) {
                            return { ...old[rowIndex], [columnId]: value }
                        }
                        return row
                    })
                )
            },
        },
        defaultColumn: {
            cell: ({ getValue, row: { index }, column: { id }, table }) => {
                const initialValue = getValue()
                const [value, setValue] = React.useState(initialValue)
                const onBlur = () => {
                    (table.options.meta as any)?.updateData(index, id, value)
                }
                React.useEffect(() => { setValue(initialValue) }, [initialValue])
                return (
                    <input
                        value={value as string}
                        onChange={e => setValue(e.target.value)}
                        onBlur={onBlur}
                        className="w-full bg-white/50 border-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1 transition-colors hover:bg-white"
                        style={{ height: '24px' }}
                    />
                )
            },
        },
    });

    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40,
        overscan: 10,
        getItemKey: (index: number) => rows[index]?.id,
    });

    // Sub-actions
    const handleDeleteRow = React.useCallback((id: string) => {
        setData(prev => prev.filter(r => r.__id !== id));
    }, []);

    // Re-validate when data changes
    React.useEffect(() => {
        validateData(data);
    }, [data]);

    const handleImport = async () => {
        if (validationReport.errors > 0) {
            toast.error("Hatalı satırlar varken içe aktarma yapılamaz. Lütfen Excel dosyanızı düzeltip tekrar yükleyin.");
            return;
        }

        setIsProcessing(true);
        try {
            // Map staging data to SmartImportRow format (V5 Hierarchy)
            const formattedRows: SmartImportRow[] = data.map(r => ({
                brand: r["Marka"] ? String(r["Marka"]) : undefined,
                gender: String(r["Cinsiyet"] || "Unisex"),
                seasonType: String(r["Mevsim"] || "4 Mevsim"),
                seasonYear: String(r["Sezon/Yıl"] || "Genel"),
                category: String(r["Ana Kategori"] || "Genel"),
                subCategory: String(r["Alt Kategori"] || "Genel"),
                modelCode: String(r["Model Kodu"]),
                color: String(r["Renk"] || "-"),
                size: String(r["Beden"] || "-"),
                barcode: r["Barkod"] ? String(r["Barkod"]) : undefined,
                sku: r["SKU"] ? String(r["SKU"]) : undefined,
                purchasePrice: Number(r["Alış Fiyatı"]) || 0,
                salePrice: Number(r["Satış Fiyatı"]) || 0,
                operationType: (r["İşlem Tipi"] === "GÜNCELLE" ? "GÜNCELLE" : "EKLE"),
                stocks: stores.reduce((acc, s) => {
                    const rawText = r[s.name];
                    acc[s.name] = (typeof rawText === "string" && (rawText.startsWith("+") || rawText.startsWith("-"))) ? rawText : (Number(rawText) || 0);
                    return acc;
                }, {} as Record<string, string | number>)
            }));

            const report = await runSmartImport(formattedRows, stores);
            
            if (report.success) {
                toast.success(`İşlem Tanıtıldı: ${report.summary.modelsCreated} Model, ${report.summary.colorsCreated} Renk, ${report.summary.variantsCreated} Beden işlendi.`);
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
                        <div style={{ height: `${rowVirtualizer.getTotalSize() + 40}px`, minWidth: `${table.getTotalSize()}px`, position: 'relative' }}>
                            {/* Header */}
                            <div className="sticky top-0 z-30 flex bg-gray-50 border-b w-full">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <React.Fragment key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <div 
                                                key={header.id} 
                                                className="h-10 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r last:border-r-0 flex items-center bg-gray-50 shrink-0"
                                                style={{ width: header.getSize() || 100 }}
                                            >
                                                {header.isPlaceholder ? null : (flexRender(header.column.columnDef.header, header.getContext()) as React.ReactNode)}
                                            </div>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Body Rows */}
                            {rowVirtualizer.getVirtualItems().map(virtualRow => {
                                const row = rows[virtualRow.index];
                                if (!row) return null;
                                return (
                                    <div 
                                        key={virtualRow.key} 
                                        className="flex hover:bg-blue-50/30 transition-colors group bg-white border-b absolute left-0 w-full"
                                        style={{
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start + 40}px)`,
                                        }}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <div 
                                                key={cell.id} 
                                                className="px-3 border-r last:border-r-0 text-xs overflow-hidden text-ellipsis whitespace-nowrap flex items-center shrink-0"
                                                style={{ width: cell.column.getSize() || 100 }}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext()) as React.ReactNode}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
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
