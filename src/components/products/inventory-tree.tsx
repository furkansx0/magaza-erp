"use client"

import * as React from "react"
import { ChevronRight, ChevronDown, Package, Store, Shirt, Palette, Pencil, Plus, Minus, RefreshCw, Trash2, Eye, EyeOff, Search } from "lucide-react"
import { deleteProductModel, deleteProductVariant, deleteProductColorGroup } from "@/actions/inventory/delete-product"
import { toggleModelArchive, toggleVariantArchive } from "@/actions/inventory/archive-product"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { adjustStock } from "@/actions/inventory/stock-actions"
import { toast } from "sonner"
import { EditVariantDialog } from "./edit-variant-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Types matching our Prisma Graph
interface StoreStock {
    storeId: string
    storeName: string
    quantity: number
    isArchived: boolean
}

interface Variant {
    id: string
    sku: string | null
    color: string | null
    size: string | null
    barcode: string
    purchasePrice: number
    salePrice: number
    stocks: StoreStock[]
    totalStock: number
    isArchived: boolean
}

interface Model {
    id: string
    name: string
    category: string
    brand: string | null
    gender: string | null
    season: string | null
    totalModelStock: number
    isArchived: boolean
    variants: Variant[]
}

export function InventoryTree({ data: models, stores }: { data: Model[], stores: { id: string, name: string }[] }) {
    const [searchQuery, setSearchQuery] = React.useState("")
    const [activeTab, setActiveTab] = React.useState("active") // "active", "archived", "all"

    // 1. Calculate Total Stock Stats (Based on Tab Logic)
    const totalActiveStock = React.useMemo(() => {
        return models.reduce((sum, model) => {
            if (model.isArchived) return sum; // Archived models fall into Passive
            // Sum only ACTIVE variants
            return sum + model.variants
                .filter(v => !v.isArchived)
                .reduce((vSum, v) => vSum + v.totalStock, 0);
        }, 0);
    }, [models]);

    const totalArchivedStock = React.useMemo(() => {
        return models.reduce((sum, model) => {
            if (model.isArchived) {
                // If model is archived, all its stock is "passive"
                return sum + model.totalModelStock;
            } else {
                // If model is active, sum only ARCHIVED variants
                return sum + model.variants
                    .filter(v => v.isArchived)
                    .reduce((vSum, v) => vSum + v.totalStock, 0);
            }
        }, 0);
    }, [models]);

    const totalAllStock = models.reduce((sum, m) => sum + m.totalModelStock, 0);

    // 2. Filter Models & Variants
    const processedModels = React.useMemo(() => {
        return models.map(model => {
            let visibleVariants = model.variants;

            if (activeTab === "active") {
                // Active Tab: Hide archived variants
                visibleVariants = model.variants.filter(v => !v.isArchived);
            } else if (activeTab === "archived") {
                // Passive Tab:
                if (model.isArchived) {
                    // Show all (since model itself is archived)
                    visibleVariants = model.variants;
                } else {
                    // Show only archived variants of active model
                    visibleVariants = model.variants.filter(v => v.isArchived);
                }
            }
            // "all": Show all variants

            return { ...model, variants: visibleVariants };
        }).filter(model => {
            // Filter out models with no visible variants (unless the model matches the tab itself)

            // Search Filter
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                !searchQuery ||
                model.name.toLowerCase().includes(searchLower) ||
                model.brand?.toLowerCase().includes(searchLower) ||
                model.category.toLowerCase().includes(searchLower) ||
                model.variants.some(v => v.barcode.toLowerCase().includes(searchLower) || v.sku?.toLowerCase().includes(searchLower));

            if (!matchesSearch) return false;

            // Empty check after variant filtering
            if (model.variants.length === 0) return false;

            // Tab specific model level check
            if (activeTab === "active" && model.isArchived) return false;
            // Note: We don't exclude active models from "archived" tab if they have archived variants (length > 0 check handles this)

            return true;
        });
    }, [models, searchQuery, activeTab]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-zinc-950 p-4 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Model, Marka, Barkod Ara..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList>
                        <TabsTrigger value="active">Aktif ({totalActiveStock})</TabsTrigger>
                        <TabsTrigger value="archived">Pasif ({totalArchivedStock})</TabsTrigger>
                        <TabsTrigger value="all">Tümü ({totalAllStock})</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Listelenen: <b>{processedModels.length}</b> Model
                </div>
            </div>

            <div className="rounded-md border bg-white dark:bg-zinc-950 shadow-sm">
                <div className="p-4 border-b bg-gray-50/50 dark:bg-gray-800/50 flex text-sm font-medium text-muted-foreground">
                    <div className="w-[400px]">Ürün Modeli</div>
                    <div className="w-[150px]">Kategori / Marka</div>
                    <div className="w-[100px] text-center">Cinsiyet</div>
                    <div className="w-[150px] text-right">Toplam Stok</div>
                    <div className="flex-1 text-right">İşlemler</div>
                </div>

                {processedModels.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        {searchQuery ? "Aramanızla eşleşen ürün bulunamadı." : "Bu kategoride ürün bulunmuyor."}
                    </div>
                ) : (
                    processedModels.map(model => (
                        <ModelRow key={model.id} model={model} stores={stores} />
                    ))
                )}
            </div>
        </div>
    )
}

import { EditModelDialog } from "./edit-model-dialog"
import { StoreVisibilityDialog } from "./store-visibility-dialog"

function ModelRow({ model, stores }: { model: Model, stores: { id: string, name: string }[] }) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [isOpenEdit, setIsOpenEdit] = React.useState(false)

    // Alert Dialog State
    const [deleteAlertOpen, setDeleteAlertOpen] = React.useState(false)
    const [visibilityDialogOpen, setVisibilityDialogOpen] = React.useState(false)



    // Delete Action
    const handleDelete = async () => {
        const result = await deleteProductModel(model.id)
        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
        setDeleteAlertOpen(false)
    }

    // Groupped by color
    const colorGroups = React.useMemo(() => {
        const groups: Record<string, Variant[]> = {}
        model.variants.forEach(v => {
            const c = v.color || "Tanımsız Renk"
            if (!groups[c]) groups[c] = []
            groups[c].push(v)
        })
        return groups
    }, [model.variants])

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={cn(
                "flex items-center p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                model.isArchived && "opacity-60 bg-gray-50 dark:bg-zinc-900"
            )}>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 p-0 mr-2">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                </CollapsibleTrigger>

                <div className="w-[400px] font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <span className={cn(model.isArchived && "line-through text-muted-foreground")}>{model.name}</span>
                    {model.isArchived && <Badge variant="secondary" className="text-xs h-5">Arşiv</Badge>}
                </div>
                <div className="w-[150px] text-sm text-muted-foreground">{model.category} / {model.brand || "-"}</div>
                <div className="w-[100px] text-center text-sm">{model.gender || "-"}</div>
                <div className="w-[150px] text-right font-bold">{model.totalModelStock}</div>
                <div className="flex-1 flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setIsOpenEdit(true)}>
                        <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>

                    {/* Archive/Visibility Dialog Trigger */}
                    <Button variant="ghost" size="icon" onClick={() => setVisibilityDialogOpen(true)} title="Görünürlük Ayarları">
                        {model.isArchived ? <EyeOff className="h-4 w-4 text-orange-500" /> : <Eye className="h-4 w-4 text-green-600" />}
                    </Button>

                    <StoreVisibilityDialog
                        open={visibilityDialogOpen}
                        onOpenChange={setVisibilityDialogOpen}
                        item={{
                            id: model.id,
                            name: model.name,
                            type: 'model',
                            isArchived: model.isArchived,
                            // For Model, we need to aggregate stocks or imply them. 
                            // Since we don't have per-store archive status for Model in frontend props (Model interface),
                            // we will assume FALSE for 'isArchived' initially or need to fetch it?
                            // Actually, 'toggleModelStockArchive' works blind. 
                            // Current `Model` interface doesn't have `stocks` array with isArchived.
                            // We can construct a dummy list based on `stores`.
                            // Or better: We should update `Model` interface to include this info if we want to show correct initial state.
                            // FOR NOW: We will start with "Active" state for all stores in UI (switch ON), 
                            // unless fetch logic is added. Converting to generic.
                            // Let's iterate `stores` and try to find if we can compute quantity.
                            stocks: stores.map(s => {
                                // Calculate total stock for this store across all variants
                                const qty = model.variants.reduce((acc, v) => {
                                    const stock = v.stocks.find(st => st.storeId === s.id)
                                    return acc + (stock?.quantity || 0)
                                }, 0)

                                // Check if ALL variants for this store are archived
                                // If model has no variants, default to global isArchived? Or false.
                                // If all variants are archived in this store, we consider the model archived in this store.
                                const allVariantsArchived = model.variants.length > 0 && model.variants.every(v => {
                                    const stock = v.stocks.find(st => st.storeId === s.id)
                                    return stock?.isArchived
                                })

                                return {
                                    storeId: s.id,
                                    storeName: s.name,
                                    quantity: qty,
                                    isArchived: allVariantsArchived
                                }
                            })
                        }}
                        stores={stores}
                    />

                    {/* Delete Button with Alert Dialog */}
                    <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteAlertOpen(true)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Modeli Silmek İstediğine Emin misin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bu işlem <b>{model.name}</b> modelini ve ona bağlı tüm varyantları silecektir.
                                    Eğer bu ürünün satış geçmişi varsa silinemez, sadece arşivlenebilir.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                    Sil
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <EditModelDialog open={isOpenEdit} onOpenChange={setIsOpenEdit} model={model} />
                </div>
            </div>

            <CollapsibleContent className="pl-12 pr-4 py-2 bg-gray-50/30 dark:bg-zinc-900/30 border-b">
                {Object.entries(colorGroups).map(([color, variants]) => (
                    <ColorGroupRow key={color} color={color} variants={variants} stores={stores} modelId={model.id} />
                ))}
            </CollapsibleContent>
        </Collapsible>
    )
}

function ColorGroupRow({ color, variants, stores, modelId }: { color: string, variants: Variant[], stores: { id: string, name: string }[], modelId: string }) {
    const [isOpen, setIsOpen] = React.useState(true)
    const totalColorStock = variants.reduce((acc, v) => acc + v.totalStock, 0)

    // Alert Dialog State for Color Group Delete
    const [deleteAlertOpen, setDeleteAlertOpen] = React.useState(false)

    const handleDelete = async () => {
        const result = await deleteProductColorGroup(modelId, color)
        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
        setDeleteAlertOpen(false)
    }


    return (
        <div className="mb-2 border rounded bg-white dark:bg-black">
            <div className="flex items-center p-2 bg-gray-100 dark:bg-zinc-800 border-b">
                <Button variant="ghost" size="sm" className="w-6 h-6 p-0 mr-2" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
                <div className="flex items-center gap-2 font-medium text-sm flex-1">
                    <Palette className="h-3 w-3" />
                    {color}
                    <Badge variant="outline" className="ml-2 bg-white dark:bg-zinc-950">{variants.length} Varyant</Badge>
                </div>
                <div className="text-sm font-bold mr-8">{totalColorStock} Adet</div>

                {/* Delete Color Group with Alert Dialog */}
                <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteAlertOpen(true)}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{color} Renk Grubunu Sil?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Bu modele ait <b>{color}</b> rengindeki tüm ürün varyantları silinecektir.
                                Satış geçmişi varsa işlem engellenir.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                Sil
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>

            {isOpen && (
                <div className="divide-y">
                    {variants.map(variant => (
                        <VariantRow key={variant.id} variant={variant} stores={stores} />
                    ))}
                </div>
            )}
        </div>
    )
}

function VariantRow({ variant, stores }: { variant: Variant, stores: { id: string, name: string }[] }) {
    const [editOpen, setEditOpen] = React.useState(false)

    // Quick Stock Adjustment State
    const [addMode, setAddMode] = React.useState(false) // false = nothing, true = adjusting
    const [val, setVal] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [targetStoreId, setTargetStoreId] = React.useState(stores[0]?.id || "")

    // Alert Dialog State
    const [deleteAlertOpen, setDeleteAlertOpen] = React.useState(false)

    const [visibilityDialogOpen, setVisibilityDialogOpen] = React.useState(false)

    // Archive handled by StoreVisibilityDialog


    const handleDelete = async () => {
        const result = await deleteProductVariant(variant.id)
        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
        }
        setDeleteAlertOpen(false)
    }

    const handleUpdate = async () => {
        if (!val || isNaN(Number(val))) return
        setLoading(true)
        const change = Number(val)

        try {
            const res = await adjustStock({
                variantId: variant.id,
                storeId: targetStoreId,
                quantity: Math.abs(change),
                type: change > 0 ? "ADD" : "REMOVE",
                reason: "Hızlı Stok Düzenleme"
            })
            if (res.success) {
                toast.success("Stok güncellendi")
                setAddMode(false)
                setVal("")
            } else {
                toast.error(res.message)
            }
        } catch (err) {
            toast.error("Hata oluştu")
        } finally {
            setLoading(false)
        }
    }


    return (
        <div className={cn(
            "flex items-center p-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-900",
            variant.isArchived && "opacity-60 bg-gray-50 dark:bg-zinc-900"
        )}>
            <div className="w-8 ml-8">
                <Shirt className={cn("h-3 w-3", variant.isArchived ? "text-gray-400" : "text-gray-400")} />
            </div>

            <div className="w-[300px] flex flex-col">
                <div className="flex items-center gap-2">
                    <span className={cn("font-medium", variant.isArchived && "line-through")}>
                        {variant.size || "Tek Ebat"} - {variant.sku || "SKU Yok"}
                    </span>
                    {variant.isArchived && <Badge variant="secondary" className="text-[10px] h-4 py-0 px-1">Pasif</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{variant.barcode}</span>
            </div>

            <div className="w-[100px] text-zinc-500">{variant.purchasePrice} ₺</div>
            <div className="w-[100px] font-medium">{variant.salePrice} ₺</div>

            {/* Stock Cells per Store */}
            <div className="flex-1 flex gap-2 overflow-x-auto">
                {stores.map(store => {
                    const stock = variant.stocks.find(s => s.storeId === store.id)
                    return (
                        <div key={store.id} className="flex flex-col items-center min-w-[60px] border-l px-2">
                            <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">{store.name}</span>
                            <span className={cn(
                                "font-bold",
                                (stock?.quantity || 0) > 0 ? "text-green-600" : "text-red-400"
                            )}>
                                {stock?.quantity || 0}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Actions */}
            <div className="w-[180px] flex justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddMode(true)} title="Hızlı Stok">
                    <RefreshCw className="h-3 w-3 text-green-600" />
                </Button>

                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)} title="Düzenle">
                    <Pencil className="h-3 w-3 text-blue-600" />
                </Button>

                {/* Archive/Visibility Dialog Trigger */}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVisibilityDialogOpen(true)} title="Görünürlük Ayarları">
                    {variant.isArchived ? <EyeOff className="h-3 w-3 text-orange-500" /> : <Eye className="h-3 w-3 text-green-600" />}
                </Button>

                <StoreVisibilityDialog
                    open={visibilityDialogOpen}
                    onOpenChange={setVisibilityDialogOpen}
                    item={{
                        id: variant.id,
                        name: variant.barcode,
                        type: 'variant',
                        isArchived: variant.isArchived,
                        stocks: variant.stocks.map(s => ({
                            storeId: s.storeId,
                            storeName: s.storeName,
                            quantity: s.quantity,
                            isArchived: s.isArchived
                        }))
                    }}
                    stores={stores}
                />

                {/* Delete Variant Dialog */}
                <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteAlertOpen(true)} title="Sil">
                        <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Varyantı Sil?</AlertDialogTitle>
                            <AlertDialogDescription>
                                <b>{variant.barcode}</b> barkodlu ürünü silmek istediğinize emin misiniz?
                                Satış geçmişi varsa silinemez.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>

            <EditVariantDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                variant={variant}
                stores={stores}
            />

            {/* Quick Add Popover (Inline) */}
            {addMode && (
                <div className="absolute right-12 z-50 bg-white dark:bg-zinc-800 border p-3 rounded shadow-lg w-[200px] flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-xs font-bold mb-1">Hızlı Stok Ekle/Çıkar</div>
                    <div className="flex gap-1">
                        <select
                            className="text-xs border rounded p-1 flex-1 bg-transparent"
                            value={targetStoreId}
                            onChange={(e) => setTargetStoreId(e.target.value)}
                        >
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-1">
                        <Input
                            autoFocus
                            placeholder="+5 veya -2"
                            className="h-8 text-xs"
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdate()
                                if (e.key === "Escape") setAddMode(false)
                            }}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" className="h-8 text-xs font-medium" onClick={() => setAddMode(false)}>İptal</Button>
                        <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 font-bold text-white shadow-sm" onClick={handleUpdate} disabled={loading}>
                            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "KAYDET"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
