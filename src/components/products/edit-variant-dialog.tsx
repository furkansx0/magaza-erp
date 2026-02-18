"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Store } from "lucide-react"
import { toast } from "sonner"
import { updateProductVariant } from "@/actions/inventory/update-variant"

interface EditVariantDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    stores: { id: string, name: string }[] // Changed from allStores to match usage context preference
    variant: {
        id: string
        sku: string | null
        barcode: string
        purchasePrice: number
        salePrice: number
        stocks: { storeId: string, storeName: string, quantity: number }[]
    }
}

export function EditVariantDialog({ open, onOpenChange, variant, stores = [] }: EditVariantDialogProps) {
    const [loading, setLoading] = React.useState(false)

    // Form State
    const [formData, setFormData] = React.useState({
        barcode: "",
        sku: "",
        salePrice: 0,
        stocks: {} as Record<string, number>
    })

    // Init state when opening
    React.useEffect(() => {
        if (!open) return

        const initialStocks: Record<string, number> = {}

        // 1. Initialize from existing variant stocks
        variant.stocks.forEach(s => {
            initialStocks[s.storeId] = s.quantity
        })

        // 2. Ensure ALL stores have an entry (default 0 if missing)
        stores.forEach(store => {
            if (initialStocks[store.id] === undefined) {
                initialStocks[store.id] = 0
            }
        })

        setFormData({
            barcode: variant.barcode,
            sku: variant.sku || "",
            salePrice: variant.salePrice,
            stocks: initialStocks
        })
    }, [variant, open, stores])

    const handleStockChange = (storeId: string, val: string) => {
        setFormData(prev => ({
            ...prev,
            stocks: { ...prev.stocks, [storeId]: Number(val) }
        }))
    }

    const onSubmit = async () => {
        setLoading(true)
        try {
            const res = await updateProductVariant({
                variantId: variant.id,
                barcode: formData.barcode,
                sku: formData.sku,
                purchasePrice: 0, // Placeholder
                salePrice: formData.salePrice,
                stocks: formData.stocks
            })

            if (res.success) {
                toast.success(res.message)
                onOpenChange(false)
            } else {
                toast.error(res.message)
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Ürün Düzenle: {variant.sku}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Barkod</Label>
                            <Input
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>SKU (Stok Kodu)</Label>
                            <Input
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Satış Fiyatı (₺)</Label>
                            <Input
                                type="number"
                                value={formData.salePrice}
                                onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="border-t my-2" />

                    {/* Stock Management */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold flex items-center justify-between">
                            Mağaza Stokları
                            <span className="text-xs font-normal text-muted-foreground">Tüm mağazalar listelenmektedir</span>
                        </Label>

                        <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-1">
                            {stores.length === 0 ? (
                                <div className="col-span-2 text-center text-sm text-muted-foreground py-4">Mağaza bulunamadı.</div>
                            ) : (
                                stores.map(store => (
                                    <div key={store.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                                        <div className={`p-2 rounded-full ${formData.stocks[store.id] > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                            <Store className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium leading-none">{store.name}</div>
                                            {formData.stocks[store.id] > 0 ? (
                                                <span className="text-[10px] text-green-600 font-medium">Stokta Var</span>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground">Stok Yok</span>
                                            )}
                                        </div>
                                        <Input
                                            type="number"
                                            className={`w-20 text-right font-bold transition-all ${formData.stocks[store.id] > 0 ? 'bg-white border-green-200 ring-green-100' : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200'}`}
                                            placeholder="0"
                                            value={formData.stocks[store.id] ?? 0}
                                            onChange={(e) => handleStockChange(store.id, e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                    <Button onClick={onSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
