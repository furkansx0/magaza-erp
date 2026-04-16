
"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, ArrowRight, Package, Trash2, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"
import { approveRecommendation, rejectRecommendation, removeTransferItem, addTransferItems } from "@/actions/inventory/transfer-recommendation-actions"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { TransferProductGrid } from "../products/transfer-product-grid"
import { ProductPicker } from "../products/product-picker"

interface RecommendedTransfersViewProps {
    recommendations: Array<{
        id: string
        transferNo: string
        sourceStore: { name: string, id: string }
        targetStore: { name: string, id: string }
        createdAt: Date | string
        items: Array<{
            id: string // StockTransferItem ID
            variantId: string
            quantitySent: number
            variant: {
                id: string
                barcode: string
                sku: string | null
                size: string | null
                purchasePrice: any
                salePrice: any
                color: { 
                    id: string,
                    name: string,
                    model: { id: string, name: string, brand?: string | null, category?: string | null, seasonType?: string | null, seasonYear?: string | null, createdAt: Date } 
                }
                stocks: Array<{ storeId: string, quantity: number }>
            }
        }>
    }>
}

export function RecommendedTransfersView({ recommendations }: RecommendedTransfersViewProps) {
    const router = useRouter()
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
    const [selectedTransfer, setSelectedTransfer] = useState<RecommendedTransfersViewProps['recommendations'][0] | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const handleApprove = async (id: string) => {
        setLoadingMap(prev => ({ ...prev, [id]: true }))
        const res = await approveRecommendation(id)
        if (res.success) {
            toast.success(res.message)
            setDialogOpen(false)
            router.refresh()
        } else {
            toast.error(res.error)
        }
        setLoadingMap(prev => ({ ...prev, [id]: false }))
    }

    const handleReject = async (id: string) => {
        if (!confirm("Bu öneriyi silmek istediğinize emin misiniz?")) return;
        setLoadingMap(prev => ({ ...prev, [id]: true }))
        const res = await rejectRecommendation(id)
        if (res.success) {
            toast.success(res.message)
            setDialogOpen(false)
            router.refresh()
        } else {
            toast.error(res.error)
        }
        setLoadingMap(prev => ({ ...prev, [id]: false }))
    }

    const handleRemoveItem = async (rowIds: string[]) => {
        if (!selectedTransfer || rowIds.length === 0) return;

        let successCount = 0;
        for (const id of rowIds) {
            // Grid returns variant ID usually or transformed row ID. 
            // In getGridData, row.id is variant.id.
            const res = await removeTransferItem(selectedTransfer.id, id)
            if (res.success) successCount++;
        }

        if (successCount > 0) {
            toast.success(`${successCount} ürün çıkarıldı`)
            router.refresh()
            // We need to update selectedTransfer state or let refresh handle it? 
            // Since selectedTransfer is from props (recommendations), refreshing router should trigger re-render of parent page, 
            // but we might need to sync selectedTransfer if dialog stays open.
            // Actually, we should probably close dialog or refetch.
            // For better UX, let's close dialog or re-find the transfer from new props if we could.
            // But simple refresh works if we accept UI might blink or we need to find it again.
            // However, recommendations prop will update, but selectedTransfer state won't automatically update unless we sync it.
            setDialogOpen(false); // Simplest approach: Close dialog to force user to re-open updated one.
        }
    }

    const handleAddItems = async (variantIds: string[]) => {
        if (!selectedTransfer) return;
        const res = await addTransferItems(selectedTransfer.id, variantIds)
        if (res.success) {
            toast.success(res.message)
            router.refresh()
            setDialogOpen(false);
        } else {
            toast.error(res.error)
        }
    }

    const getGridData = (transfer: RecommendedTransfersViewProps['recommendations'][0]) => {
        const productsMap = new Map<string, any>()

        transfer.items.forEach(item => {
            const p = item.variant.color.model
            const color = item.variant.color

            if (!productsMap.has(p.id)) {
                productsMap.set(p.id, {
                    ...p,
                    createdAt: new Date(),
                    colors: []
                })
            }

            const product = productsMap.get(p.id)
            
            // Find or create color layer
            let productColor = product.colors.find((c: any) => c.id === color.id)
            if (!productColor) {
                productColor = { ...color, variants: [] }
                product.colors.push(productColor)
            }

            productColor.variants.push({
                ...item.variant,
                color: color.name,
                transferQuantity: item.quantitySent,
                stocks: item.variant.stocks || []
            })
        })

        return Array.from(productsMap.values())
    }

    /* Selection Handler for Removal */
    const [selectedForRemoval, setSelectedForRemoval] = useState<string[]>([])

    const [showListDialog, setShowListDialog] = useState(false)

    return (
        <>
            <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="relative">
                        <Package className="mr-2 h-4 w-4" />
                        Önerilen Transferler
                        {recommendations.length > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-200">
                                {recommendations.length}
                            </Badge>
                        )}
                        {recommendations.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                        )}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <DialogTitle>Önerilen Transferler</DialogTitle>
                                <DialogDescription>
                                    Sistem tarafından otomatik oluşturulan transfer önerileri.
                                </DialogDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={async () => {
                                const res = await import("@/actions/inventory/transfer-recommendation-actions").then(m => m.refreshAllRecommendations());
                                if (res.success) toast.success(res.message);
                                else toast.error(res.error);
                            }}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Önerileri Hesapla
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-4 space-y-4">
                        {recommendations.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                Henüz önerilen bir transfer yok.
                            </div>
                        )}
                        {recommendations.map((transfer) => (
                            <Card key={transfer.id} className="overflow-hidden border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-all group mb-2"
                                onClick={() => { setSelectedTransfer(transfer); setDialogOpen(true); setSelectedForRemoval([]); }}
                            >
                                <div className="p-3 flex items-center justify-between">
                                    {/* Left: Icon & Main Info (Stores) */}
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-md">
                                            <Package className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                                <span>{transfer.sourceStore.name}</span>
                                                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{transfer.targetStore.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                                                <span>{transfer.transferNo}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span>{format(new Date(transfer.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Badge & Action */}
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 text-[10px] h-6 px-2 font-medium">
                                            {transfer.items.length} Ürün
                                        </Badge>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-300 hover:text-red-600 hover:bg-red-50 -mr-1"
                                            onClick={(e) => { e.stopPropagation(); handleReject(transfer.id); }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog (Nested) */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="!max-w-none w-[90vw] h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 pb-2 bg-gray-50 border-b">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-4">
                                    <div>
                                        <DialogTitle>Transfer Düzenleme: {selectedTransfer?.transferNo}</DialogTitle>
                                        <DialogDescription>
                                            {selectedTransfer?.sourceStore.name} -&gt; {selectedTransfer?.targetStore.name}
                                        </DialogDescription>
                                    </div>
                                    <div className="h-10 w-[1px] bg-gray-200 mx-2" />
                                    <div>
                                        <h3 className="text-sm font-semibold tracking-tight">Transfer Edilecek Ürünler</h3>
                                        <p className="text-xs text-gray-500">Bu transfer için seçilen ürünlerin listesi ve stok durumları.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                {selectedForRemoval.length > 0 && (
                                    <Button size="sm" variant="destructive" onClick={() => handleRemoveItem(selectedForRemoval)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Seçilileri Çıkar ({selectedForRemoval.length})
                                    </Button>
                                )}
                                <div className="w-[300px]">
                                    <ProductPicker onSelect={handleAddItems} trigger={
                                        <Button size="sm" variant="outline" className="w-full bg-white">
                                            <Package className="mr-2 h-4 w-4" /> Ürün Ekle / Ara...
                                        </Button>
                                    } />
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden bg-white p-4 flex flex-col gap-4">
                        {selectedTransfer && (
                            <div className="flex-1 border rounded-lg flex flex-col min-h-0 overflow-hidden">
                                <TransferProductGrid
                                    key={selectedTransfer.id}
                                    products={getGridData(selectedTransfer)}
                                    stores={[selectedTransfer.sourceStore, selectedTransfer.targetStore]}
                                    facets={
                                        (() => {
                                            const dataMap = getGridData(selectedTransfer).flatMap(p => 
                                                p.colors.flatMap((c: any) => 
                                                    c.variants.map((v: any) => ({ ...v, ...p, color: c.name }))
                                                )
                                            );
                                            const brands = Array.from(new Set(dataMap.map(d => d.brand).filter(Boolean))).map(v => ({ value: v as string, count: 0, checked: false }));
                                            const categories = Array.from(new Set(dataMap.map(d => d.category).filter(Boolean))).map(v => ({ value: v as string, count: 0, checked: false }));
                                            const seasonTypes = Array.from(new Set(dataMap.map(d => d.seasonType).filter(Boolean))).map(v => ({ value: v as string, count: 0, checked: false }));
                                            const seasonYears = Array.from(new Set(dataMap.map(d => d.seasonYear).filter(Boolean))).map(v => ({ value: v as string, count: 0, checked: false }));
                                            return { brands, categories, seasonTypes, seasonYears };
                                        })()
                                    }
                                    totalCount={selectedTransfer.items.length}
                                    onSelectionChange={setSelectedForRemoval}
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-gray-50 flex justify-between items-center h-[70px]">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Kapat</Button>
                        <div className="flex gap-2">
                            <Button variant="destructive" onClick={() => selectedTransfer && handleReject(selectedTransfer.id)}>
                                Reddet
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => selectedTransfer && handleApprove(selectedTransfer.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Onayla ve Transferi Başlat
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
