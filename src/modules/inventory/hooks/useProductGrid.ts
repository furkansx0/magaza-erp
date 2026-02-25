import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ProductWithVariants } from "@/actions/inventory/product-query-actions"
import { bulkArchive, bulkUnarchive, bulkUpdatePrice, bulkDelete } from "@/actions/inventory/bulk-actions"
import { bulkCreateTransfer } from "@/actions/inventory/bulk-transfer-action"
import * as XLSX from "xlsx"

export type ViewMode = "flat" | "model_tree" | "color_grouped"

export type GridRow = {
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
    type: "MODEL" | "COLOR" | "VARIANT"
    expanded?: boolean
    depth?: number
    parentId?: string
    [key: string]: any
}

interface UseProductGridProps {
    products: ProductWithVariants[]
    stores: { id: string, name: string }[]
}

export function useProductGrid({ products, stores }: UseProductGridProps) {
    const router = useRouter()

    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [priceDialogOpen, setPriceDialogOpen] = React.useState(false)
    const [priceOperation, setPriceOperation] = React.useState<"PERCENTAGE_INCREASE" | "PERCENTAGE_DECREASE" | "SET_FIXED_PRICE">("PERCENTAGE_INCREASE")
    const [priceValue, setPriceValue] = React.useState("")
    const [transferDialogOpen, setTransferDialogOpen] = React.useState(false)
    const [sourceStoreId, setSourceStoreId] = React.useState("")
    const [targetStoreId, setTargetStoreId] = React.useState("")

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

        if (viewMode === "flat") return allVariants;

        if (viewMode === "color_grouped") {
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
            products.forEach(p => {
                const productVariants = allVariants.filter(v => v.productId === p.id);
                if (productVariants.length === 0) return;

                const first = productVariants[0];
                const modelRow: GridRow = {
                    ...first,
                    id: p.id,
                    type: "MODEL",
                    sku: p.modelCode || "-",
                    barcode: "-",
                    color: "(Modeller)",
                    size: "-",
                    depth: 0,
                    stockTotal: 0,
                    totalSold: 0
                };

                stores.forEach(s => modelRow[`stock_${s.id}`] = 0);
                productVariants.forEach(v => {
                    modelRow.stockTotal += v.stockTotal;
                    modelRow.totalSold += v.totalSold;
                    stores.forEach(s => modelRow[`stock_${s.id}`] += v[`stock_${s.id}`]);
                });

                rows.push(modelRow);

                if (expandedRows[p.id]) {
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
                        stores.forEach(s => colorRow[`stock_${s.id}`] = 0);
                        vars.forEach(v => {
                            colorRow.stockTotal += v.stockTotal;
                            colorRow.totalSold += v.totalSold;
                            stores.forEach(s => colorRow[`stock_${s.id}`] += v[`stock_${s.id}`]);
                        });

                        rows.push(colorRow);

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

    const uniqueBrands = React.useMemo(() => Array.from(new Set(data.map(r => r.brand).filter(Boolean))).sort(), [data])
    const uniqueCategories = React.useMemo(() => Array.from(new Set(data.map(r => r.category).filter(Boolean))).sort(), [data])
    const uniqueSeasons = React.useMemo(() => Array.from(new Set(data.map(r => r.season).filter(Boolean))).sort(), [data])
    const uniqueColors = React.useMemo(() => Array.from(new Set(data.map(r => r.color).filter(Boolean))).sort(), [data])
    const uniqueSizes = React.useMemo(() => Array.from(new Set(data.map(r => r.size).filter(Boolean))).sort(), [data])

    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
    const [selectedBrands, setSelectedBrands] = React.useState<string[]>([])
    const [selectedSeasons, setSelectedSeasons] = React.useState<string[]>([])
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
        if (selectedSeasons.length > 0) filtered = filtered.filter(r => selectedSeasons.includes(r.season))
        if (selectedColors.length > 0) filtered = filtered.filter(r => selectedColors.includes(r.color))
        if (selectedSizes.length > 0) filtered = filtered.filter(r => selectedSizes.includes(r.size))
        if (selectedStore !== "all") filtered = filtered.filter(r => r[`stock_${selectedStore}`] > 0)

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

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredData.length) setSelectedIds([])
        else setSelectedIds(filteredData.map(r => r.id))
    }

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(i => i !== id))
        else setSelectedIds(prev => [...prev, id])
    }

    const handleBulkArchive = async () => {
        if (selectedIds.length === 0) return toast.error("Ürün seçiniz");
        const isArchivedView = new URLSearchParams(window.location.search).get("status") === "archived";
        if (!confirm(`${selectedIds.length} ürünü ${isArchivedView ? "arşivden çıkarmak" : "arşivlemek"} istediğinize emin misiniz?`)) return;
        const res = isArchivedView ? await bulkUnarchive(selectedIds) : await bulkArchive(selectedIds);
        if (res.success) { toast.success(res.message); setSelectedIds([]); router.refresh(); }
        else toast.error(res.error);
    }

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

    const visibleStores = stores.filter(s => selectedStore === 'all' || s.id === selectedStore);

    return {
        // Form & Dialog Values
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

        // Data & Filters
        data, filteredData,
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

        // Actions & Handlers
        toggleExpand,
        toggleSelectAll,
        toggleSelect,
        handleBulkArchive,
        handleBulkDelete,
        handleBulkPriceUpdate,
        handleBulkTransfer,
        handleExportExcel,
        expandedRows
    }
}
