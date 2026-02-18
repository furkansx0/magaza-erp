"use client"

import * as React from "react"
import { Eye, EyeOff, Store, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { toggleVariantArchive, toggleStockArchive, toggleModelArchive, toggleModelStockArchive } from "@/actions/inventory/archive-product"

interface VisibilityItem {
    id: string
    name: string
    isArchived: boolean
    type: 'model' | 'variant'
    stocks: {
        storeId: string
        storeName: string
        quantity: number
        isArchived: boolean
    }[]
}

interface StoreVisibilityDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: VisibilityItem
    stores: { id: string, name: string }[]
}

export function StoreVisibilityDialog({ open, onOpenChange, item, stores }: StoreVisibilityDialogProps) {
    const [loading, setLoading] = React.useState(false)
    const [globalArchive, setGlobalArchive] = React.useState(item.isArchived)

    // Local state for store statuses to support optimistic updates
    const [storeStatuses, setStoreStatuses] = React.useState<Record<string, boolean>>({})

    // Initialize local state from props
    React.useEffect(() => {
        setGlobalArchive(item.isArchived)
        const initialStatuses: Record<string, boolean> = {}
        item.stocks.forEach(s => {
            initialStatuses[s.storeId] = s.isArchived
        })
        setStoreStatuses(initialStatuses)
    }, [item, open])


    const handleGlobalToggle = async (checked: boolean) => {
        // Checked = Active
        // isArchived = !Checked
        const newIsArchived = !checked

        // Optimistic UI
        setGlobalArchive(newIsArchived)
        setLoading(true)

        const action = item.type === 'model' ? toggleModelArchive : toggleVariantArchive
        const result = await action(item.id, newIsArchived)

        setLoading(false)

        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.message)
            // Revert on error
            setGlobalArchive(!newIsArchived)
        }
    }

    const handleStoreToggle = async (storeId: string, checked: boolean) => {
        // Checked = Active
        // isArchived = !Checked
        const newIsArchived = !checked

        // Optimistic UI
        setStoreStatuses(prev => ({ ...prev, [storeId]: newIsArchived }))

        const action = item.type === 'model' ? toggleModelStockArchive : toggleStockArchive
        const res = await action(item.id, storeId, newIsArchived)

        if (res.success) {
            toast.success("Mağaza durumu güncellendi")
        } else {
            toast.error(res.message)
            // Revert on error
            setStoreStatuses(prev => ({ ...prev, [storeId]: !newIsArchived }))
        }
    }

    // Merge stores with item.stocks
    const storeRows = stores.map(store => {
        const stockRecord = item.stocks.find(s => s.storeId === store.id)
        const quantity = stockRecord ? stockRecord.quantity : 0
        // Use local state if available, fallback to prop
        // Use ?? to allow false
        const isArchived = storeStatuses[store.id] ?? (stockRecord ? stockRecord.isArchived : false)

        return {
            ...store,
            quantity,
            isArchived
        }
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Görünürlük Ayarları
                        <Badge variant="outline">{item.name}</Badge>
                        <Badge className="ml-auto text-xs" variant={item.type === 'model' ? "default" : "secondary"}>
                            {item.type === 'model' ? "MODEL" : "VARYANT"}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        {item.type === 'model'
                            ? "Bu modelin ve tüm alt ürünlerinin görünürlüğünü yönetin."
                            : "Bu varyantın mağaza bazlı satış durumunu yönetin."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Global Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-full", !globalArchive ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}>
                                {!globalArchive ? <Globe className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                            </div>
                            <div>
                                <div className="font-medium">Genel Satış Durumu</div>
                                <div className="text-xs text-muted-foreground">
                                    {!globalArchive ? "Tüm mağazalarda satışa açık" : "Tamamen satışa kapatıldı"}
                                </div>
                            </div>
                        </div>
                        <Switch
                            checked={!globalArchive}
                            onCheckedChange={handleGlobalToggle}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground ml-1">Mağaza Bazlı Ayarlar</div>
                        {globalArchive && (
                            <div className="text-xs bg-orange-50 text-orange-600 p-2 rounded mb-2 flex items-center gap-2">
                                <EyeOff className="h-3 w-3" />
                                {item.type === 'model'
                                    ? "Model genel olarak pasif olduğu için mağaza ayarları etkisizdir."
                                    : "Ürün genel olarak pasif olduğu için mağaza ayarları etkisizdir."}
                            </div>
                        )}

                        <div className="border rounded-md divide-y">
                            {storeRows.map(store => (
                                <div key={store.id} className={cn("flex items-center justify-between p-3", globalArchive && "opacity-50 pointer-events-none")}>
                                    <div className="flex items-center gap-3">
                                        <Store className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{store.name}</span>
                                            <span className="text-xs text-muted-foreground">TOPLAM STOK: {store.quantity} Adet</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-xs font-medium", !store.isArchived ? "text-green-600" : "text-gray-400")}>
                                            {!store.isArchived ? "Aktif" : "Pasif"}
                                        </span>
                                        <Switch
                                            checked={!store.isArchived}
                                            onCheckedChange={(checked) => handleStoreToggle(store.id, checked)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Kapat</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
