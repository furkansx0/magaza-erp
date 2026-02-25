"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { formatCurrency, cn } from "@/lib/utils"
import { ProductWithVariants } from "@/actions/inventory/product-query-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, Save, Archive, RefreshCw, Printer, Tag, ArrowRightLeft, Filter, X, Check, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ExcelImportDialog } from "@/components/products/excel-import-dialog"
import { ProductWizard } from "./product-wizard"
import { MoreHorizontal, PlusCircle, LayoutList, LayoutGrid, ListTree, ChevronRight, ChevronDown } from "lucide-react"
import { MultiSelectFilter } from "@/components/ui/multi-select-filter"
import { useProductGrid, GridRow } from "../hooks/useProductGrid"

interface ProductGridProps {
    products: ProductWithVariants[]
    stores: { id: string, name: string }[]
    facets: {
        brands: { checked: boolean, count: number, value: string }[]
        categories: { checked: boolean, count: number, value: string }[]
        seasons: { checked: boolean, count: number, value: string }[]
    }
    totalCount?: number
}

export function ProductGrid(props: ProductGridProps) {
    const { products, stores, facets } = props;
    const parentRef = React.useRef<HTMLDivElement>(null)
    const router = useRouter()

    const {
        selectedIds, setSelectedIds,
        priceDialogOpen, setPriceDialogOpen,
        priceOperation, setPriceOperation,
        priceValue, setPriceValue,
        transferDialogOpen, setTransferDialogOpen,
        sourceStoreId, setSourceStoreId,
        targetStoreId, setTargetStoreId,
        wizardOpen, setWizardOpen,
        wizardData, setWizardData,
        wizardMode, setWizardMode,
        viewMode, setViewMode,

        filteredData,
        uniqueBrands, uniqueCategories, uniqueSeasons, uniqueColors, uniqueSizes,
        selectedCategories, setSelectedCategories,
        selectedBrands, setSelectedBrands,
        selectedSeasons, setSelectedSeasons,
        selectedColors, setSelectedColors,
        selectedSizes, setSelectedSizes,
        selectedStore, setSelectedStore,
        searchTerm, setSearchTerm,
        sortOption, setSortOption,
        visibleStores,

        toggleExpand,
        toggleSelectAll,
        toggleSelect,
        handleBulkArchive,
        handleBulkDelete,
        handleBulkPriceUpdate,
        handleBulkTransfer,
        handleExportExcel,
        expandedRows
    } = useProductGrid(props);

    // --- COLUMN RESIZING LOGIC ---
    // Initial widths
    const [colWidths, setColWidths] = React.useState<Record<string, number>>({
        sku: 110,
        name: 180,
        barcode: 90,
        color: 45,
        size: 45,
        brand: 90,
        season: 80,
        priceIn: 75,
        priceOut: 75,
        stockIn: 55,
        totalStock: 65,
        totalSold: 65
    });

    const resizingRef = React.useRef<{ col: string, startX: number, startWidth: number } | null>(null);

    const startResize = (e: React.MouseEvent, col: string) => {
        e.preventDefault();
        resizingRef.current = { col, startX: e.clientX, startWidth: colWidths[col] || (col.startsWith('store_') ? 55 : 60) };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!resizingRef.current) return;
        const diff = e.clientX - resizingRef.current.startX;
        const newWidth = Math.max(30, resizingRef.current.startWidth + diff); // Min width 30px
        setColWidths(prev => ({ ...prev, [resizingRef.current!.col]: newWidth }));
    };

    const onMouseUp = () => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
    };

    const autoResize = (col: string, fieldKey?: keyof GridRow) => {
        if (!fieldKey && !col.startsWith('store_')) return;

        let maxWidth = 40; // min
        const font = "bold 12px sans-serif"; // Approximate font
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) context.font = font;

        // Check first 50 rows for speed
        const sample = filteredData.slice(0, 50);
        sample.forEach(row => {
            let text = "";
            if (col.startsWith('store_')) {
                const storeId = col.replace('store_', '');
                text = String(row[`stock_${storeId}`] || 0);
            } else if (fieldKey) {
                text = String(row[fieldKey] || "");
            }
            if (context) {
                const w = context.measureText(text).width;
                if (w > maxWidth) maxWidth = w;
            }
        });

        // Add padding
        setColWidths(prev => ({ ...prev, [col]: Math.min(300, maxWidth + 20) })); // Max auto 300
    };

    // Helper to generate Grid Template string
    const getGridTemplate = () => {
        const sb = [
            "40px", // Checkbox
            `${colWidths.sku}px`,
            `${colWidths.name}px`,
            `${colWidths.barcode}px`,
            `${colWidths.color}px`,
            `${colWidths.size}px`,
            `${colWidths.brand}px`,
            `${colWidths.season}px`,
            `${colWidths.priceIn}px`,
            `${colWidths.priceOut}px`,
            ...visibleStores.map(s => `${colWidths[`store_${s.id}`] || colWidths.stockIn}px`),
            `${colWidths.totalStock}px`,
            `${colWidths.totalSold}px`,
            "40px" // Actions
        ];
        return sb.join(" ");
    };

    const rowVirtualizer = useVirtualizer({
        count: filteredData.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
        overscan: 20
    })

    return (
        <div className="flex flex-col h-full bg-gray-100 gap-1 text-xs">
            {/* Top Compact Bar: Title + Actions + Main Filters */}
            <div className="bg-white border rounded shadow-sm p-2 flex flex-col gap-2">

                {/* Row 1: Title + Add Button + Global Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold tracking-tight">Ürün Yönetimi</h2>
                        <div className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                            {props.totalCount} ürün
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Product Actions Component integrated here via children or just render logic if we move it */}
                        {/* Since ProductActions was separate, we need to bring "Add Product" functionality here. 
                             For now, let's assume we pass ProductActions as a prop or replicate the button. 
                             To be safe and clean, let's import ProductWizard trigger here or keep it simple. 
                             User said "Don't remove functionality". ProductActions had "New Product" button.
                             We will add a "New Product" button here that triggers the Wizard.
                          */}
                        <Button onClick={() => {
                            setWizardMode("create");
                            setWizardData(null);
                            setWizardOpen(true);
                        }} size="sm" className="h-7 text-xs bg-black text-white hover:bg-gray-800">
                            <PlusCircle className="w-3 h-3 mr-1" /> Yeni Ürün Ekle
                        </Button>
                    </div>
                </div>

                <Separator />

                {/* Row 2: Compact Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Hızlı Arama */}
                    <div className="relative w-[140px]">
                        <Search className="absolute left-2 top-1.5 h-3 w-3 text-gray-400" />
                        <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-7 pl-7 text-[10px] bg-gray-50 border-gray-200" placeholder="Hızlı Ara..." />
                    </div>

                    {/* Sıralama */}
                    <Select value={sortOption} onValueChange={setSortOption}>
                        <SelectTrigger className="h-7 w-[100px] text-[10px] bg-gray-50 border-gray-200">
                            <div className="flex items-center text-gray-500">
                                <ArrowRightLeft className="w-3 h-3 mr-1" />
                                <SelectValue placeholder="Sıralama" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Varsayılan</SelectItem>
                            <SelectItem value="date_newest">Tarih (En Yeni)</SelectItem>
                            <SelectItem value="date_oldest">Tarih (En Eski)</SelectItem>
                            <SelectItem value="stock_desc">Stok (Çoktan Aza)</SelectItem>
                            <SelectItem value="stock_asc">Stok (Azdan Çoğa)</SelectItem>
                            <SelectItem value="sold_desc">En Çok Satılan</SelectItem>
                            <SelectItem value="sold_asc">En Az Satılan</SelectItem>
                            <SelectItem value="price_out_desc">Fiyat (Pahalıdan Ucuza)</SelectItem>
                            <SelectItem value="price_out_asc">Fiyat (Ucuzdan Pahalıya)</SelectItem>
                            <SelectItem value="margin_desc">En Yüksek Kar Marjı</SelectItem>
                            <SelectItem value="margin_asc">En Düşük Kar Marjı</SelectItem>
                            <SelectItem value="name_asc">İsim (A-Z)</SelectItem>
                            <SelectItem value="brand_asc">Marka (A-Z)</SelectItem>
                            <SelectItem value="category_asc">Kategori (A-Z)</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="h-4 w-[1px] bg-gray-300 mx-1" />

                    {/* Filters Row - GRID Layout */}
                    {/* Filters Row - FLEX Wrap Layout */}
                    <div className="flex flex-wrap gap-1 flex-1 w-full items-center">
                        <div className="min-w-[80px] flex-1"><MultiSelectFilter title="Kategori" options={uniqueCategories} selected={selectedCategories} onChange={setSelectedCategories} /></div>
                        <div className="min-w-[80px] flex-1"><MultiSelectFilter title="Marka" options={uniqueBrands} selected={selectedBrands} onChange={setSelectedBrands} /></div>
                        <div className="min-w-[80px] flex-1"><MultiSelectFilter title="Sezon" options={uniqueSeasons} selected={selectedSeasons} onChange={setSelectedSeasons} /></div>
                        <div className="min-w-[80px] flex-1"><MultiSelectFilter title="Renk" options={uniqueColors} selected={selectedColors} onChange={setSelectedColors} /></div>
                        <div className="min-w-[80px] flex-1"><MultiSelectFilter title="Beden" options={uniqueSizes} selected={selectedSizes} onChange={setSelectedSizes} /></div>

                        {/* Status & Store in Flex Cell */}
                        <div className="flex gap-1 min-w-[140px]">
                            <Select defaultValue="active" onValueChange={(val) => {
                                const params = new URLSearchParams(window.location.search);
                                if (val === "archived") params.set("status", "archived"); else params.delete("status");
                                router.push(`?${params.toString()}`);
                            }}>
                                <SelectTrigger className="h-7 text-[10px] bg-gray-50 border-dashed flex-1"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="active">Aktif</SelectItem><SelectItem value="archived">Arşiv</SelectItem></SelectContent>
                            </Select>

                            <Select value={selectedStore} onValueChange={setSelectedStore}>
                                <SelectTrigger className="h-7 text-[10px] bg-gray-50 border-dashed flex-1"><SelectValue placeholder="Tümü" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Depolar</SelectItem>
                                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>


                </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-1 overflow-x-auto bg-gray-200 p-1 rounded-t-md border-b-0 items-center">
                <Button variant="secondary" size="sm" onClick={() => router.refresh()} className="h-7 text-xs bg-white hover:text-blue-600"><RefreshCw className="w-3 h-3 mr-1" /> Yenile</Button>
                <div className="w-[1px] h-4 bg-gray-300 my-auto mx-1" />
                <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
                    <DialogTrigger asChild><Button variant="ghost" size="sm" disabled={selectedIds.length === 0} className="h-7 text-xs hover:bg-white"><Tag className="w-3 h-3 mr-1" /> Fiyat</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Toplu Fiyat</DialogTitle></DialogHeader>
                        <div className="py-4 space-y-4">
                            <Select value={priceOperation} onValueChange={(v: any) => setPriceOperation(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PERCENTAGE_INCREASE">Yüzde Zam</SelectItem><SelectItem value="PERCENTAGE_DECREASE">Yüzde İndirim</SelectItem><SelectItem value="SET_FIXED_PRICE">Sabit Fiyat</SelectItem></SelectContent></Select>
                            <Input type="number" value={priceValue} onChange={e => setPriceValue(e.target.value)} placeholder="Değer" />
                        </div>
                        <DialogFooter><Button onClick={handleBulkPriceUpdate}>Güncelle</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                    <DialogTrigger asChild><Button variant="ghost" size="sm" disabled={selectedIds.length === 0} className="h-7 text-xs hover:bg-white"><ArrowRightLeft className="w-3 h-3 mr-1" /> Transfer</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Transfer</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2"><Label>Kaynak</Label><Select onValueChange={setSourceStoreId}><SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger><SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-2"><Label>Hedef</Label><Select onValueChange={setTargetStoreId}><SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger><SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <DialogFooter><Button onClick={handleBulkTransfer}>Oluştur</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={handleBulkDelete} disabled={selectedIds.length === 0} className="h-7 text-xs hover:bg-white hover:text-red-700 text-red-600"><Trash2 className="w-3 h-3 mr-1" /> Sil</Button>
                <div className="w-[1px] h-4 bg-gray-300 my-auto mx-1" />
                <Button variant="ghost" size="sm" onClick={handleBulkArchive} disabled={selectedIds.length === 0} className="h-7 text-xs hover:bg-white hover:text-orange-600"><Archive className="w-3 h-3 mr-1" /> Arşiv</Button>

                <Button variant="ghost" size="sm" onClick={handleExportExcel} className="h-7 text-xs hover:bg-white hover:text-green-700 text-green-700 bg-green-50/50 border border-green-200/50">
                    <Filter className="w-3 h-3 mr-1" /> Excel'e Aktar
                </Button>

                <div className="w-[1px] h-4 bg-gray-300 my-auto mx-1" />
                <ExcelImportDialog stores={stores} onSuccess={() => router.refresh()} />

                <Button variant="ghost" size="sm" onClick={() => window.print()} className="h-7 text-xs hover:bg-white"><Printer className="w-3 h-3 mr-1" /> Yazdır</Button>

                <div className="w-[1px] h-4 bg-gray-300 my-auto mx-1" />

                <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                    <SelectTrigger className="h-7 text-xs border-none bg-transparent hover:bg-white w-[140px]">
                        <SelectValue placeholder="Görünüm" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="flat"><span className="flex items-center"><LayoutList className="w-3 h-3 mr-2" /> Tümü (Düz)</span></SelectItem>
                        <SelectItem value="color_grouped"><span className="flex items-center"><LayoutGrid className="w-3 h-3 mr-2" /> Renk Gruplu</span></SelectItem>
                        <SelectItem value="model_tree"><span className="flex items-center"><ListTree className="w-3 h-3 mr-2" /> Model Ağacı</span></SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Grid */}
            <div ref={parentRef} className="flex-1 border bg-white rounded-b-md shadow-inner overflow-auto relative" style={{ contain: 'strict' }}>
                <div className="w-full relative" style={{ height: `${rowVirtualizer.getTotalSize() + 45}px` }}>
                    {/* Header */}
                    <div className="sticky top-0 z-30 grid bg-gray-100 border-b shadow-sm font-bold text-gray-600 select-none items-center h-[45px]"
                        style={{
                            gridTemplateColumns: getGridTemplate(),
                            width: 'max-content',
                            minWidth: '100%'
                        }}
                    >
                        <div className="p-2 border-r text-center flex justify-center sticky left-0 z-40 bg-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <Checkbox checked={filteredData.length > 0 && selectedIds.length === filteredData.length} onCheckedChange={toggleSelectAll} className="h-3 w-3" />
                        </div>

                        {/* Resizable Headers */}
                        {[
                            { id: 'sku', label: 'Stok Kodu' },
                            { id: 'name', label: 'Model Adı' },
                            { id: 'barcode', label: 'Barkod' },
                            { id: 'color', label: 'Renk' },
                            { id: 'size', label: 'Beden' },
                            { id: 'brand', label: 'Marka' },
                            { id: 'season', label: 'Sezon' },
                            { id: 'priceIn', label: 'Alış', align: 'right' },
                            { id: 'priceOut', label: 'Satış', align: 'right' },
                        ].map(col => (
                            <div key={col.id} className={cn("p-2 border-r relative group flex items-center h-full", col.align === 'right' && "justify-end")}>
                                {col.label}
                                <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-gray-300 transition-colors z-10"
                                    onMouseDown={(e) => startResize(e, col.id)}
                                    onDoubleClick={() => autoResize(col.id, col.id === 'priceIn' ? 'purchasePrice' : col.id === 'priceOut' ? 'salePrice' : col.id === 'name' ? 'modelName' : col.id as any)}
                                />
                            </div>
                        ))}

                        {/* Store Headers */}
                        {visibleStores.map(s => (
                            <div key={s.id} className="p-2 border-r text-center text-blue-800 relative group h-full flex items-center justify-center" title={s.name}>
                                {s.name.substring(0, 3).toUpperCase()}
                                <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-gray-300 transition-colors z-10"
                                    onMouseDown={(e) => startResize(e, `store_${s.id}`)}
                                    onDoubleClick={() => autoResize(`store_${s.id}`)}
                                />
                            </div>
                        ))}

                        <div className="p-2 border-r text-center font-bold relative group h-full flex items-center justify-center">
                            T. Giriş
                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-gray-300 transition-colors z-10" onMouseDown={(e) => startResize(e, 'totalStock')} />
                        </div>
                        <div className="p-2 border-r text-center font-bold relative group h-full flex items-center justify-center">
                            Satılan
                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-gray-300 transition-colors z-10" onMouseDown={(e) => startResize(e, 'totalSold')} />
                        </div>
                        <div className="p-2 border-r text-center"></div>
                    </div>

                    {/* Rows */}
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = filteredData[virtualRow.index]
                        return (
                            <div key={row.id}
                                className={cn("absolute top-0 left-0 grid hover:bg-blue-50 transition-colors items-center border-b whitespace-nowrap", virtualRow.index % 2 === 0 ? "bg-white" : "bg-gray-50/50")}
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start + 45}px)`,
                                    gridTemplateColumns: getGridTemplate(), // Dynamic Template
                                    width: 'max-content',
                                    minWidth: '100%'
                                }}
                            >
                                <div className={cn("px-2 border-r h-full flex items-center justify-center sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]", virtualRow.index % 2 === 0 ? "bg-white" : "bg-gray-50")}>
                                    <Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleSelect(row.id)} className="h-3 w-3" />
                                </div>
                                <div className="px-2 border-r h-full flex items-center font-mono text-[10px] overflow-hidden text-ellipsis">{row.sku}</div>
                                <div className="px-2 border-r h-full flex items-center font-medium overflow-hidden text-ellipsis" style={{ paddingLeft: `${(row.depth || 0) * 20 + 8}px` }} title={row.modelName}>
                                    {(row.type === "MODEL" || (viewMode === "model_tree" && row.type === "COLOR")) && (
                                        <button onClick={() => toggleExpand(row.id)} className="mr-1 hover:bg-gray-200 rounded p-0.5">
                                            {expandedRows[row.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </button>
                                    )}
                                    <span className={cn("truncate", row.type === "MODEL" && "font-bold text-blue-700", row.type === "COLOR" && "text-gray-900")}>
                                        {row.modelName}
                                    </span>
                                </div>
                                <div className="px-2 border-r h-full flex items-center font-mono text-[10px] overflow-hidden text-ellipsis">{row.barcode}</div>
                                <div className="px-2 border-r h-full flex items-center overflow-hidden text-ellipsis">{row.color}</div>
                                <div className="px-2 border-r h-full flex items-center font-bold overflow-hidden text-ellipsis">{row.size}</div>
                                <div className="px-2 border-r h-full flex items-center overflow-hidden text-ellipsis">{row.brand}</div>
                                <div className="px-2 border-r h-full flex items-center text-gray-500 text-[10px] overflow-hidden text-ellipsis">{row.season}</div>
                                <div className="px-2 border-r h-full flex items-center justify-end font-mono text-gray-500 overflow-hidden text-ellipsis">{formatCurrency(row.purchasePrice)}</div>
                                <div className="px-2 border-r h-full flex items-center justify-end font-bold text-green-700 font-mono bg-green-50/50 overflow-hidden text-ellipsis">{formatCurrency(row.salePrice)}</div>
                                {visibleStores.map(s => (
                                    <div key={s.id} className={cn("px-2 border-r h-full flex items-center justify-center font-mono font-bold overflow-hidden text-ellipsis", row[`stock_${s.id}`] > 0 ? "text-black" : "text-gray-200")}>
                                        {row[`stock_${s.id}`]}
                                    </div>
                                ))}
                                <div className="px-2 border-r h-full flex items-center justify-center font-mono font-bold text-gray-700 overflow-hidden text-ellipsis">{row.stockTotal}</div>
                                <div className="px-2 border-r h-full flex items-center justify-center font-mono font-bold text-gray-700 overflow-hidden text-ellipsis">{row.totalSold || 0}</div>
                                <div className="px-2 border-r h-full flex items-center justify-center">
                                    <div className="flex justify-center gap-1">
                                        <Button
                                            variant="ghost"
                                            className="h-6 w-6 p-0 hover:bg-blue-100 text-blue-600 rounded-full"
                                            onClick={() => {
                                                const originalProduct = products.find(p => p.id === row.productId);
                                                if (originalProduct) {
                                                    setWizardData(originalProduct);
                                                    setWizardMode("edit");
                                                    setWizardOpen(true);
                                                } else {
                                                    toast.error("Ürün verisi bulunamadı");
                                                }
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            {/* Footer Status */}
            <div className="bg-white border p-1 text-[10px] text-gray-500 flex justify-between shadow-sm rounded-sm">
                <div>Toplam Kayıt: <strong>{filteredData.length}</strong></div>
                <div>Seçili: <strong>{selectedIds.length}</strong></div>
            </div>

            {/* Wizard */}
            {wizardOpen && (
                <ProductWizard
                    open={wizardOpen}
                    onOpenChange={(v) => {
                        setWizardOpen(v);
                        if (!v) {
                            setWizardData(null);
                            setWizardMode("create");
                        }
                    }}
                    stores={stores}
                    initialProduct={wizardData}
                    mode={wizardMode}
                />
            )}
        </div>
    )
}
