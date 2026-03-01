"use client"

import * as React from "react"
import * as XLSX from "xlsx"
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
import { bulkArchive, bulkUnarchive, bulkUpdatePrice, bulkDelete } from "@/actions/inventory/bulk-actions"
import { bulkCreateTransfer } from "@/actions/inventory/bulk-transfer-action"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ExcelImportDialog } from "./excel-import-dialog"
import { ProductWizard } from "./wizard/product-wizard"
import { MoreHorizontal, PlusCircle, LayoutList, LayoutGrid, ListTree, ChevronRight, ChevronDown } from "lucide-react"

// View Modes
type ViewMode = "flat" | "model_tree" | "color_grouped"

// Flattened Data Structure for the Grid
type GridRow = {
    id: string
    productId: string
    modelName: string
    sku: string
    barcode: string
    color: string
    size: string
    brand: string
    category: string
    season: string
    stockTotal: number
    purchasePrice: number
    salePrice: number
    createdAt: Date
    // Tree Props
    type: "MODEL" | "COLOR" | "VARIANT"
    expanded?: boolean
    depth?: number
    parentId?: string
    [key: string]: any
}

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

function MultiSelectFilter({
    title,
    options,
    selected,
    onChange
}: {
    title: string
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
}) {
    const [search, setSearch] = React.useState("")
    const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 border-dashed text-[10px] px-2 w-full justify-start font-normal bg-gray-50 border-gray-300">
                    <Filter className="mr-2 h-3 w-3" />
                    {title}
                    {selected.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-3" />
                            <div className="hidden space-x-1 lg:flex">
                                {selected.length > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal text-[10px] h-5">
                                        {selected.length} seçili
                                    </Badge>
                                ) : (
                                    selected.map((option) => (
                                        <Badge
                                            variant="secondary"
                                            key={option}
                                            className="rounded-sm px-1 font-normal text-[10px] h-5"
                                        >
                                            {option}
                                        </Badge>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2 pb-2">
                    <Input
                        placeholder="Ara..."
                        className="h-8 text-xs"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="max-h-[200px] overflow-auto p-1 space-y-1">
                    {filteredOptions.length === 0 && <div className="text-center text-xs p-2 text-gray-500">Sonuç yok.</div>}
                    {filteredOptions.map(option => {
                        const isSelected = selected.includes(option)
                        return (
                            <div
                                key={option}
                                className={cn(
                                    "flex items-center space-x-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                    isSelected && "bg-accent"
                                )}
                                onClick={() => {
                                    if (isSelected) {
                                        onChange(selected.filter(s => s !== option))
                                    } else {
                                        onChange([...selected, option])
                                    }
                                }}
                            >
                                <div className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                )}>
                                    <Check className="h-3 w-3" />
                                </div>
                                <span className="text-xs flex-1 truncate">{option}</span>
                            </div>
                        )
                    })}
                </div>
                {selected.length > 0 && (
                    <>
                        <Separator />
                        <div className="p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-[10px] h-7"
                                onClick={() => onChange([])}
                            >
                                Temizle
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    )
}

export function ProductGrid(props: ProductGridProps) {
    const { products, stores, facets } = props;
    const parentRef = React.useRef<HTMLDivElement>(null)
    const router = useRouter()

    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [priceDialogOpen, setPriceDialogOpen] = React.useState(false)
    const [priceOperation, setPriceOperation] = React.useState<"PERCENTAGE_INCREASE" | "PERCENTAGE_DECREASE" | "SET_FIXED_PRICE">("PERCENTAGE_INCREASE")
    const [priceValue, setPriceValue] = React.useState("")
    const [transferDialogOpen, setTransferDialogOpen] = React.useState(false)
    const [sourceStoreId, setSourceStoreId] = React.useState("")
    const [targetStoreId, setTargetStoreId] = React.useState("")

    // Wizard State
    const [wizardOpen, setWizardOpen] = React.useState(false)
    const [wizardData, setWizardData] = React.useState<any>(null)
    const [wizardMode, setWizardMode] = React.useState<"create" | "append" | "edit">("create")

    const [viewMode, setViewMode] = React.useState<ViewMode>("flat")
    const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({})

    const toggleExpand = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const data = React.useMemo(() => {
        if (!products || !Array.isArray(products)) return [];

        // 1. Base Flattening (Variant Level)
        const allVariants: GridRow[] = []
        products.forEach(p => {
            p.variants.forEach(v => {
                const row: GridRow = {
                    id: v.id,
                    productId: p.id,
                    modelName: p.name,
                    sku: v.sku || "",
                    barcode: v.barcode,
                    color: v.color || "-",
                    size: v.size || "-",
                    brand: p.brand || "-",
                    category: p.category || "-",
                    season: p.season || "-",
                    stockTotal: 0,
                    purchasePrice: Number(v.purchasePrice),
                    salePrice: Number(v.salePrice),
                    createdAt: new Date(p.createdAt),
                    type: "VARIANT",
                    depth: 0
                }

                let total = 0
                stores.forEach(s => {
                    const st = v.stocks.find(stock => stock.storeId === s.id)
                    const qty = st?.quantity || 0
                    row[`stock_${s.id}`] = qty
                    total += qty
                })
                row.stockTotal = total
                const saleItems = (v as any).saleItems || []
                row.totalSold = saleItems.reduce((acc: number, item: any) => acc + item.quantity, 0)
                allVariants.push(row)
            })
        })

        // 2. View Mode Transformation
        if (viewMode === "flat") return allVariants;

        if (viewMode === "color_grouped") {
            // Group by Model + Color
            const groups = new Map<string, GridRow>();
            allVariants.forEach(v => {
                const key = `${v.modelName}-${v.color}`;
                if (!groups.has(key)) {
                    groups.set(key, { ...v, type: "COLOR", size: "(Tümü)", id: `grp-${key}` });
                } else {
                    const g = groups.get(key)!;
                    g.stockTotal += v.stockTotal;
                    g.totalSold += v.totalSold;
                    stores.forEach(s => { g[`stock_${s.id}`] += v[`stock_${s.id}`] });
                }
            });
            return Array.from(groups.values());
        }

        if (viewMode === "model_tree") {
            const rows: GridRow[] = [];
            // Group by Model
            const models = new Map<string, { model: any, variants: GridRow[] }>(); // model object from products array? No, just use first variant metadata

            // We need access to original product ID for grouping accurately
            products.forEach(p => {
                // Collect variants for this model
                const productVariants = allVariants.filter(v => v.productId === p.id);
                if (productVariants.length === 0) return; // Should not happen

                const first = productVariants[0];
                const modelRow: GridRow = {
                    ...first,
                    id: p.id, // Model ID
                    type: "MODEL",
                    sku: p.modelCode || "-",
                    barcode: "-",
                    color: "(Modeller)",
                    size: "-",
                    depth: 0,
                    stockTotal: 0,
                    totalSold: 0
                };

                // Aggregate totals
                stores.forEach(s => modelRow[`stock_${s.id}`] = 0);
                productVariants.forEach(v => {
                    modelRow.stockTotal += v.stockTotal;
                    modelRow.totalSold += v.totalSold;
                    stores.forEach(s => modelRow[`stock_${s.id}`] += v[`stock_${s.id}`]);
                });

                rows.push(modelRow);

                // If Model Expanded
                if (expandedRows[p.id]) {
                    // Group Variants by Color
                    const colors = new Map<string, GridRow[]>();
                    productVariants.forEach(v => {
                        if (!colors.has(v.color)) colors.set(v.color, []);
                        colors.get(v.color)!.push(v);
                    });

                    colors.forEach((vars, colorName) => {
                        const colorId = `${p.id}-${colorName}`;
                        const colorRow: GridRow = {
                            ...vars[0],
                            id: colorId,
                            type: "COLOR",
                            size: "-",
                            sku: "-",
                            barcode: "-",
                            depth: 1,
                            parentId: p.id,
                            stockTotal: 0,
                            totalSold: 0
                        };
                        // Aggregate Color totals
                        stores.forEach(s => colorRow[`stock_${s.id}`] = 0);
                        vars.forEach(v => {
                            colorRow.stockTotal += v.stockTotal;
                            colorRow.totalSold += v.totalSold;
                            stores.forEach(s => colorRow[`stock_${s.id}`] += v[`stock_${s.id}`]);
                        });

                        rows.push(colorRow);

                        // If Color Expanded
                        if (expandedRows[colorId]) {
                            vars.forEach(v => {
                                rows.push({ ...v, depth: 2, parentId: colorId });
                            });
                        }
                    });
                }
            });
            return rows;
        }

        return allVariants;
    }, [products, stores, viewMode, expandedRows])

    // Derive Options (Client side filtering for now)
    const uniqueBrands = React.useMemo(() => Array.from(new Set(data.map(r => r.brand).filter(Boolean))).sort(), [data])
    const uniqueCategories = React.useMemo(() => Array.from(new Set(data.map(r => r.category).filter(Boolean))).sort(), [data])
    const uniqueSeasons = React.useMemo(() => Array.from(new Set(data.map(r => r.season).filter(Boolean))).sort(), [data])
    const uniqueColors = React.useMemo(() => Array.from(new Set(data.map(r => r.color).filter(Boolean))).sort(), [data])
    const uniqueSizes = React.useMemo(() => Array.from(new Set(data.map(r => r.size).filter(Boolean))).sort(), [data])

    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
    const [selectedBrands, setSelectedBrands] = React.useState<string[]>([])
    const [selectedSeasons, setSelectedSeasons] = React.useState<string[]>([]) // New State
    const [selectedColors, setSelectedColors] = React.useState<string[]>([])
    const [selectedSizes, setSelectedSizes] = React.useState<string[]>([])
    const [selectedStore, setSelectedStore] = React.useState("all")
    const [searchTerm, setSearchTerm] = React.useState("")
    const [filteredData, setFilteredData] = React.useState(data)
    const [sortOption, setSortOption] = React.useState("default")

    React.useEffect(() => {
        let filtered = [...data]

        if (searchTerm) {
            const lower = searchTerm.toLowerCase()
            filtered = filtered.filter(r =>
                r.modelName.toLowerCase().includes(lower) ||
                r.sku.toLowerCase().includes(lower) ||
                r.barcode.includes(lower)
            )
        }

        if (selectedCategories.length > 0) filtered = filtered.filter(r => selectedCategories.includes(r.category))
        if (selectedBrands.length > 0) filtered = filtered.filter(r => selectedBrands.includes(r.brand))
        if (selectedSeasons.length > 0) filtered = filtered.filter(r => selectedSeasons.includes(r.season)) // Filter
        if (selectedColors.length > 0) filtered = filtered.filter(r => selectedColors.includes(r.color))
        if (selectedSizes.length > 0) filtered = filtered.filter(r => selectedSizes.includes(r.size))
        if (selectedStore !== "all") filtered = filtered.filter(r => r[`stock_${selectedStore}`] > 0)

        // Sorting (Optimized)
        if (sortOption !== "default") {
            filtered.sort((a, b) => {
                if (sortOption === "name_asc") return a.modelName.localeCompare(b.modelName)

                if (sortOption === "stock_asc") return a.stockTotal - b.stockTotal
                if (sortOption === "stock_desc") return b.stockTotal - a.stockTotal

                if (sortOption === "sold_asc") return (a.totalSold || 0) - (b.totalSold || 0)
                if (sortOption === "sold_desc") return (b.totalSold || 0) - (a.totalSold || 0)

                if (sortOption === "price_in_asc") return a.purchasePrice - b.purchasePrice
                if (sortOption === "price_in_desc") return b.purchasePrice - a.purchasePrice

                if (sortOption === "price_out_asc") return a.salePrice - b.salePrice
                if (sortOption === "price_out_desc") return b.salePrice - a.salePrice

                // New Options
                if (sortOption === "date_newest") return b.createdAt.getTime() - a.createdAt.getTime()
                if (sortOption === "date_oldest") return a.createdAt.getTime() - b.createdAt.getTime()

                if (sortOption === "brand_asc") return a.brand.localeCompare(b.brand)

                if (sortOption === "category_asc") return a.category.localeCompare(b.category)

                if (sortOption === "margin_desc") return (b.salePrice - b.purchasePrice) - (a.salePrice - a.purchasePrice)
                if (sortOption === "margin_asc") return (a.salePrice - a.purchasePrice) - (b.salePrice - b.purchasePrice)

                return 0
            })
        }

        setFilteredData(filtered)
    }, [searchTerm, selectedCategories, selectedBrands, selectedSeasons, selectedColors, selectedSizes, selectedStore, sortOption, data])

    // Handlers
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredData.length) setSelectedIds([])
        else setSelectedIds(filteredData.map(r => r.id))
    }
    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(i => i !== id))
        else setSelectedIds(prev => [...prev, id])
    }

    // Reuse Handlers (bulkArchive, bulkPrice, bulkTransfer) - logic assumed same
    // Reuse Handlers (bulkArchive, bulkPrice, bulkTransfer) - logic assumed same
    const handleBulkArchive = async () => {
        if (selectedIds.length === 0) return toast.error("Ürün seçiniz");
        const isArchivedView = new URLSearchParams(window.location.search).get("status") === "archived";
        if (!confirm(`${selectedIds.length} ürünü ${isArchivedView ? "arşivden çıkarmak" : "arşivlemek"} istediğinize emin misiniz?`)) return;
        const res = isArchivedView ? await bulkUnarchive(selectedIds) : await bulkArchive(selectedIds);
        if (res.success) { toast.success(res.message); setSelectedIds([]); router.refresh(); }
        else toast.error(res.error);
    }

    // NEW: Bulk Delete Handler
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return toast.error("Ürün seçiniz");
        if (!confirm(`DİKKAT: ${selectedIds.length} ürünü KALICI OLARAK silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!\n\n(Satış geçmişi olan ürünler silinmez, sadece uyarılır.)`)) return;

        const res = await bulkDelete(selectedIds);
        if (res.success) {
            if ((res as any).partial) toast.warning(res.message);
            else toast.success(res.message);
            setSelectedIds([]);
            router.refresh();
        }
        else toast.error(res.error);
    }

    const handleBulkPriceUpdate = async () => {
        const val = Number(priceValue);
        if (isNaN(val) || val <= 0) return toast.error("Geçerli değer girin");
        const res = await bulkUpdatePrice(selectedIds, { type: priceOperation, value: val });
        if (res.success) { toast.success(res.message); setPriceDialogOpen(false); setSelectedIds([]); router.refresh(); }
        else toast.error(res.error);
    }
    const handleBulkTransfer = async () => {
        if (!sourceStoreId || !targetStoreId || sourceStoreId === targetStoreId) return toast.error("Mağazalar geçersiz");
        const res = await bulkCreateTransfer(selectedIds, sourceStoreId, targetStoreId);
        if (res.success) { toast.success(res.message); setTransferDialogOpen(false); setSelectedIds([]); router.push(`/dashboard/transfers/${res.transferId}`); }
        else toast.error(res.error);
    }

    // --- COLUMN RESIZING LOGIC ---
    // Initial widths
    const [colWidths, setColWidths] = React.useState<Record<string, number>>({
        sku: 140,
        name: 180,
        barcode: 90,
        color: 45,
        size: 45,
        brand: 90,
        season: 80,
        priceIn: 75,
        priceOut: 75,
        stockIn: 55, // Store columns base width
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


    // Excel Export Handler
    const handleExportExcel = () => {
        if (filteredData.length === 0) return toast.error("Dışarı aktarılacak veri yok.");

        const exportData = filteredData.map(row => {
            const rowData: any = {
                "Stok Kodu": row.sku,
                "Model Adı": row.modelName,
                "Barkod": row.barcode,
                "Renk": row.color,
                "Beden": row.size,
                "Marka": row.brand,
                "Kategori": row.category,
                "Sezon": row.season,
                "Alış Fiyatı": row.purchasePrice,
                "Satış Fiyatı": row.salePrice,
                "Toplam Stok": row.stockTotal,
                "Toplam Satılan": row.totalSold || 0
            };
            stores.forEach(s => {
                rowData[s.name] = row[`stock_${s.id}`] || 0;
            });
            return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ürün Listesi");
        const wscols = Object.keys(exportData[0]).map(k => ({ wch: 15 }));
        wscols[1] = { wch: 30 };
        worksheet['!cols'] = wscols;
        const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
        XLSX.writeFile(workbook, `Urun_Listesi_${dateStr}.xlsx`);
        toast.success(`${exportData.length} ürün Excel'e aktarıldı.`);
    }

    const rowVirtualizer = useVirtualizer({
        count: filteredData.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
        overscan: 20
    })

    const visibleStores = stores.filter(s => selectedStore === 'all' || s.id === selectedStore);

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
                                            title="Ürünü Düzenle"
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

                                        {row.type === "VARIANT" && (
                                            <Button
                                                variant="ghost"
                                                className="h-6 w-6 p-0 hover:bg-gray-200 text-gray-700 rounded-full"
                                                title="Barkod Etiketi Yazdır"
                                                onClick={async () => {
                                                    try {
                                                        const { printBarcode } = await import("@/lib/print-barcode");
                                                        await printBarcode({
                                                            modelName: row.sku,
                                                            sku: row.sku,
                                                            barcode: row.barcode,
                                                            size: row.size,
                                                            season: row.season,
                                                            salePrice: row.salePrice
                                                        });
                                                        toast.success("Yazdırma komutu gönderildi.");
                                                    } catch (err: any) {
                                                        toast.error(err.message || "Yazdırma hatası");
                                                    }
                                                }}
                                            >
                                                <Printer className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
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
