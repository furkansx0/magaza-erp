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
    Save,
    Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { runSmartImport, SmartImportRow } from "@/actions/inventory/bulk-import-action"
import { toast } from "sonner"

interface ExcelStagingAreaProps {
    isOpen: boolean;
    onClose: () => void;
    stores: { id: string, name: string }[];
}

type RowType = "FULL" | "VARIANT_ADD" | "BARCODE_ONLY" | "INVALID";

function detectRowType(r: any, storeNames: string[]): RowType {
    const hasBarcode = !!(r["Barkod"] && String(r["Barkod"]).trim());
    const hasModelCode = !!(r["Model Kodu"] && String(r["Model Kodu"]).trim());
    const hasColor = !!(r["Renk"] && String(r["Renk"]).trim());
    const hasSize = !!(r["Beden"] && String(r["Beden"]).trim());
    const hasMetadata = !!(r["Marka"] || r["Cinsiyet"] || r["Ana Kategori"]);

    const hasStock = storeNames.some(s => {
        const v = r[s];
        return v !== undefined && v !== null && v !== "" && v !== 0 && v !== "0";
    });

    if (hasModelCode && hasColor && hasSize && hasMetadata) return "FULL";
    if (hasModelCode && hasColor && hasSize) return "VARIANT_ADD";
    if (hasBarcode) return "BARCODE_ONLY";
    return "INVALID";
}

const ROW_TYPE_LABELS: Record<RowType, { label: string; color: string }> = {
    FULL: { label: "Tam", color: "bg-green-100 text-green-700 border border-green-200" },
    VARIANT_ADD: { label: "Varyant", color: "bg-blue-100 text-blue-700 border border-blue-200" },
    BARCODE_ONLY: { label: "Stok", color: "bg-orange-100 text-orange-700 border border-orange-200" },
    INVALID: { label: "Hatalı", color: "bg-red-100 text-red-700 border border-red-200" },
};

export function ExcelStagingArea({ isOpen, onClose, stores }: ExcelStagingAreaProps) {
    const [data, setData] = React.useState<any[]>([])
    const [isProcessing, setIsProcessing] = React.useState(false)
    const [stats, setStats] = React.useState({ full: 0, variantAdd: 0, barcodeOnly: 0, invalid: 0 })
    
    const parentRef = React.useRef<HTMLDivElement>(null)
    const storeNames = stores.map(s => s.name);

    // 1. Template Download — 3 example rows showing each row type
    const downloadTemplate = () => {
        const header = [
            // Core identification
            "Model Kodu", "Renk", "Beden", "Barkod", "SKU",
            // Metadata (required for FULL, auto-filled from DB for VARIANT_ADD)
            "Marka", "Cinsiyet", "Mevsim", "Sezon/Yıl", "Ana Kategori", "Alt Kategori",
            // Pricing
            "Alış Fiyatı", "Satış Fiyatı",
        ];
        storeNames.forEach(s => header.push(s));

        // Row 1: FULL — brand new product with all fields
        const row1 = [
            "GR10450", "Siyah", "42", "", "GR10450-SYH-42",
            "Nike", "Erkek", "Yazlık", "2024 Yaz", "Ayakkabı", "Spor Ayakkabı",
            "1200", "2500",
        ];
        storeNames.forEach(() => row1.push("10"));

        // Row 2: VARIANT_ADD — new size for existing model GR10450
        const row2 = [
            "GR10450", "Siyah", "43", "", "",
            "", "", "", "", "", "",
            "", "",
        ];
        storeNames.forEach(() => row2.push("5"));

        // Row 3: BARCODE_ONLY — only barcode, only update stock
        const row3 = [
            "", "", "", "8691234567890", "",
            "", "", "", "", "", "",
            "", "",
        ];
        storeNames.forEach(() => row3.push("3"));

        const ws = XLSX.utils.aoa_to_sheet([header, row1, row2, row3]);

        // Style header row
        ws["!cols"] = header.map(() => ({ wch: 16 }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Urun_Sablonu");
        XLSX.writeFile(wb, "Smart_Import_V6.xlsx");
    }

    // 2. File Upload & Parse
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ""; // Reset so same file can be re-uploaded

        const reader = new FileReader();
        reader.onload = (evt) => {
            const buffer = evt.target?.result;
            const wb = XLSX.read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });
            
            const cleanedData = rawData.map((row: any, index: number) => {
                const newRow: any = {};
                Object.keys(row).forEach(k => {
                    newRow[k.trim()] = typeof row[k] === "number" ? row[k] : String(row[k]).trim();
                });
                newRow["__id"] = `row-${index}`;
                return newRow;
            });

            setData(cleanedData);
            computeStats(cleanedData);
        };
        reader.readAsArrayBuffer(file);
    }

    const computeStats = (rows: any[]) => {
        const s = { full: 0, variantAdd: 0, barcodeOnly: 0, invalid: 0 };
        rows.forEach(r => {
            const t = detectRowType(r, storeNames);
            if (t === "FULL") s.full++;
            else if (t === "VARIANT_ADD") s.variantAdd++;
            else if (t === "BARCODE_ONLY") s.barcodeOnly++;
            else s.invalid++;
        });
        setStats(s);
    }

    const handleDeleteRow = React.useCallback((id: string) => {
        setData(prev => {
            const next = prev.filter(r => r.__id !== id);
            computeStats(next);
            return next;
        });
    }, [storeNames]);

    // 4. Table Columns
    const columns = React.useMemo<ColumnDef<any>[]>(() => {
        const base: ColumnDef<any>[] = [
            {
                id: "actions",
                header: "",
                size: 36,
                cell: ({ row }) => (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-red-400 hover:text-red-700"
                        onClick={() => handleDeleteRow(row.original.__id)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                ),
            },
            {
                id: "__type",
                header: "Tip",
                size: 70,
                cell: ({ row }) => {
                    const t = detectRowType(row.original, storeNames);
                    const { label, color } = ROW_TYPE_LABELS[t];
                    return (
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", color)}>
                            {label}
                        </span>
                    );
                }
            },
            { accessorKey: "Model Kodu", header: "Model Kodu", size: 110 },
            { accessorKey: "Renk", header: "Renk", size: 90 },
            { accessorKey: "Beden", header: "Beden", size: 65 },
            { accessorKey: "Barkod", header: "Barkod", size: 130 },
            { accessorKey: "SKU", header: "SKU", size: 130 },
            { accessorKey: "Marka", header: "Marka", size: 90 },
            { accessorKey: "Cinsiyet", header: "Cinsiyet", size: 80 },
            { accessorKey: "Mevsim", header: "Mevsim", size: 80 },
            { accessorKey: "Sezon/Yıl", header: "Sezon/Yıl", size: 90 },
            { accessorKey: "Ana Kategori", header: "Ana Kat.", size: 110 },
            { accessorKey: "Alt Kategori", header: "Alt Kat.", size: 120 },
            { accessorKey: "Alış Fiyatı", header: "Alış", size: 80 },
            { accessorKey: "Satış Fiyatı", header: "Satış", size: 80 },
        ];

        stores.forEach(s => {
            base.push({
                accessorKey: s.name,
                header: s.name,
                size: 70,
                cell: ({ getValue }) => {
                    const v = getValue() as string;
                    const isInc = typeof v === "string" && (v.startsWith("+") || v.startsWith("-"));
                    return (
                        <span className={cn("font-mono text-xs", isInc ? "text-blue-600 font-bold" : "")}>
                            {v || ""}
                        </span>
                    );
                }
            });
        });

        return base;
    }, [stores, storeNames, handleDeleteRow]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (row) => row.__id,
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
                        className="w-full bg-transparent border-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1 -mx-1 transition-colors"
                        style={{ height: '24px', fontSize: '11px' }}
                    />
                )
            },
        },
        meta: {
            updateData: (rowIndex: number, columnId: string, value: any) => {
                setData(old => old.map((row, index) => {
                    if (index === rowIndex) return { ...old[rowIndex], [columnId]: value };
                    return row;
                }));
            },
        },
    });

    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 38,
        overscan: 12,
        getItemKey: (index: number) => rows[index]?.id,
    });

    const handleImport = async () => {
        if (stats.invalid > 0) {
            toast.error(`${stats.invalid} geçersiz satır var! Her satırın ya barkodu, ya da Model+Renk+Beden bilgisi olmalı.`);
            return;
        }
        if (data.length === 0) {
            toast.error("Veri yok.");
            return;
        }

        setIsProcessing(true);
        try {
            const formattedRows: SmartImportRow[] = data.map(r => ({
                modelCode: r["Model Kodu"] ? String(r["Model Kodu"]) : undefined,
                color: r["Renk"] ? String(r["Renk"]) : undefined,
                size: r["Beden"] ? String(r["Beden"]) : undefined,
                barcode: r["Barkod"] ? String(r["Barkod"]) : undefined,
                sku: r["SKU"] ? String(r["SKU"]) : undefined,
                brand: r["Marka"] ? String(r["Marka"]) : undefined,
                gender: r["Cinsiyet"] ? String(r["Cinsiyet"]) : undefined,
                seasonType: r["Mevsim"] ? String(r["Mevsim"]) : undefined,
                seasonYear: r["Sezon/Yıl"] ? String(r["Sezon/Yıl"]) : undefined,
                category: r["Ana Kategori"] ? String(r["Ana Kategori"]) : undefined,
                subCategory: r["Alt Kategori"] ? String(r["Alt Kategori"]) : undefined,
                purchasePrice: r["Alış Fiyatı"] ? Number(r["Alış Fiyatı"]) : undefined,
                salePrice: r["Satış Fiyatı"] ? Number(r["Satış Fiyatı"]) : undefined,
                stocks: stores.reduce((acc, s) => {
                    const rawText = r[s.name];
                    if (rawText === "" || rawText === undefined || rawText === null) return acc;
                    acc[s.name] = (typeof rawText === "string" && (rawText.startsWith("+") || rawText.startsWith("-")))
                        ? rawText
                        : (Number(rawText) || 0);
                    return acc;
                }, {} as Record<string, string | number>)
            }));

            const report = await runSmartImport(formattedRows, stores);

            if (report.success) {
                toast.success(
                    `✅ Başarılı! ${report.summary.fullRows} tam kayıt, ${report.summary.variantAddRows} varyant eki, ${report.summary.barcodeOnlyRows} stok güncellemesi.`
                );
                setData([]);
                setStats({ full: 0, variantAdd: 0, barcodeOnly: 0, invalid: 0 });
                onClose();
            } else {
                const errorMsg = report.logs.find(l => l.type === "error")?.message || "İçe aktarım başarısız.";
                toast.error(errorMsg);
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
            {/* Header */}
            <header className="h-14 border-b flex items-center justify-between px-5 bg-gray-50/60 grow-0 shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">Excel Smart Import</h1>
                        <p className="text-[10px] text-muted-foreground font-medium">Retail Engine v6.0 • Akıllı Çoklu Satır Tipi</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-8 text-xs">
                        <Download className="h-3.5 w-3.5 mr-1.5" /> Şablonu İndir
                    </Button>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".xlsx,.xls" 
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Button variant="secondary" size="sm" className="h-8 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100">
                            <FileUp className="h-3.5 w-3.5 mr-1.5" /> Dosya Seç
                        </Button>
                    </div>
                    <div className="h-5 w-px bg-gray-300 mx-0.5" />
                    <Button 
                        size="sm" 
                        onClick={handleImport} 
                        disabled={data.length === 0 || isProcessing || stats.invalid > 0}
                        className="h-8 text-xs bg-black hover:bg-zinc-800 text-white"
                    >
                        {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Sisteme Aktar
                    </Button>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="border-b bg-white flex items-center px-5 gap-6 grow-0 shrink-0 py-2.5">
                <div className="flex items-center gap-2 pr-5 border-r">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="text-lg font-black leading-none">{data.length}</div>
                        <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Toplam Satır</div>
                    </div>
                </div>

                <div className="flex gap-6 text-sm">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Tam Kayıt</span>
                        <span className="font-bold text-green-700 text-base leading-tight">{stats.full}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Varyant Eki</span>
                        <span className="font-bold text-blue-700 text-base leading-tight">{stats.variantAdd}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Stok Güncelle</span>
                        <span className="font-bold text-orange-600 text-base leading-tight">{stats.barcodeOnly}</span>
                    </div>
                    {stats.invalid > 0 && (
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Hatalı</span>
                            <span className="font-bold text-red-600 text-base leading-tight">{stats.invalid}</span>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="ml-auto flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-[10px] text-gray-500 border">
                    <Info className="h-3 w-3 text-gray-400 shrink-0" />
                    <span><b className="text-green-600">Tam</b>: Tüm bilgiler dolu &nbsp;·&nbsp; <b className="text-blue-600">Varyant</b>: Model+Renk+Beden (DB'den eksik bilgileri çeker) &nbsp;·&nbsp; <b className="text-orange-600">Stok</b>: Sadece Barkod</span>
                </div>
            </div>

            {/* Error banner */}
            {stats.invalid > 0 && (
                <div className="bg-red-50 border-b border-red-200 px-5 py-2 flex items-center gap-2 text-xs text-red-700 font-medium grow-0 shrink-0">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span><b>{stats.invalid} hatalı satır</b> var. Bu satırlarda ne barkod, ne de Model+Renk+Beden kombinasyonu bulunmadı. Sisteme aktarım bu satırlar çözülene kadar bloklu.</span>
                </div>
            )}

            {/* Table */}
            <main className="flex-1 overflow-hidden relative bg-zinc-100">
                {data.length > 0 ? (
                    <div ref={parentRef} className="h-full overflow-auto">
                        <div style={{ height: `${rowVirtualizer.getTotalSize() + 38}px`, minWidth: `${table.getTotalSize()}px`, position: 'relative' }}>
                            {/* Header */}
                            <div className="sticky top-0 z-30 flex bg-gray-100 border-b shadow-sm">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <React.Fragment key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <div 
                                                key={header.id} 
                                                className="h-9 px-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r last:border-r-0 flex items-center bg-gray-100 shrink-0"
                                                style={{ width: header.getSize() || 80 }}
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
                                const rowType = detectRowType(row.original, storeNames);
                                const isInvalid = rowType === "INVALID";
                                return (
                                    <div 
                                        key={virtualRow.key} 
                                        className={cn(
                                            "flex transition-colors group border-b absolute left-0",
                                            isInvalid ? "bg-red-50 hover:bg-red-100/50" : virtualRow.index % 2 === 0 ? "bg-white hover:bg-blue-50/30" : "bg-gray-50/50 hover:bg-blue-50/30"
                                        )}
                                        style={{
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start + 38}px)`,
                                            width: `${table.getTotalSize()}px`
                                        }}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <div 
                                                key={cell.id} 
                                                className="px-2 border-r last:border-r-0 text-xs overflow-hidden text-ellipsis whitespace-nowrap flex items-center shrink-0"
                                                style={{ width: cell.column.getSize() || 80 }}
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
                        <div className="h-20 w-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-zinc-300">
                            <FileUp className="h-10 w-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Dosya Yüklenmedi</h3>
                            <p className="text-sm text-gray-400 max-w-md mt-1">
                                Şablonu indirin, doldurun ve yükleyin. Satırlar karışık olabilir:
                                Tam kayıt, yalnızca Model+Renk+Beden veya sadece Barkod.
                            </p>
                            <div className="mt-4 flex gap-2 justify-center text-[11px]">
                                <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">Tam: Tüm alanlar</span>
                                <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold">Varyant: Model+Renk+Beden</span>
                                <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 font-semibold">Stok: Sadece Barkod</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="h-7 border-t bg-gray-100 flex items-center px-4 justify-between grow-0 shrink-0">
                <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Status: {data.length > 0 ? `${data.length} Satır Yüklü` : 'Boş'}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">Smart Retail Engine v6.0</div>
            </footer>
        </div>
    )
}
