"use client"

import * as React from "react"
import { Search, ArrowRight, Truck, Check, Trash2, Box } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { searchPosProducts, PosProduct } from "@/actions/pos/pos-actions"
import { transferStock, TransferItem } from "@/actions/inventory/transfer-actions"
import { Checkbox } from "@/components/ui/checkbox"

interface QuickTransferWidgetProps {
    currentStoreId: string;
    allStores: { id: string; name: string }[];
    currentStaffId: string;
}

export function QuickTransferWidget({ currentStoreId, allStores, currentStaffId }: QuickTransferWidgetProps) {
    const [isOpen, setIsOpen] = React.useState(false) // Whether widget is expanded
    const [barcode, setBarcode] = React.useState("")
    const [items, setItems] = React.useState<TransferItem[]>([])
    const [searching, setSearching] = React.useState(false)
    const [confirmOpen, setConfirmOpen] = React.useState(false)
    const [selectedTargetStore, setSelectedTargetStore] = React.useState<string | null>(null)
    const [transferring, setTransferring] = React.useState(false)

    // Safety check states
    const [validationStep, setValidationStep] = React.useState<1 | 2>(1)
    const [firstSelection, setFirstSelection] = React.useState<string | null>(null)

    const inputRef = React.useRef<HTMLInputElement>(null)

    // Reset when closed
    React.useEffect(() => {
        if (!isOpen) {
            setItems([])
            setBarcode("")
            setConfirmOpen(false)
            resetValidation()
        } else {
            // Auto focus
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    const resetValidation = () => {
        setValidationStep(1)
        setFirstSelection(null)
        setSelectedTargetStore(null)
    }

    const handleScan = async (e: React.FormEvent) => {
        // ... (Scanning logic is fine, unchanged)
        e.preventDefault()
        if (!barcode.trim()) return

        setSearching(true)
        try {
            const products = await searchPosProducts(barcode, currentStoreId)
            const exactMatch = products.find(p => p.barcode === barcode) || products[0];

            if (!exactMatch) {
                toast.error("Ürün bulunamadı")
                return
            }
            if (exactMatch.stock <= 0) {
                toast.warning("Bu mağazada stok yok görünüyor, yine de ekleniyor.");
            }
            addItem(exactMatch)
            setBarcode("")
        } catch (err) {
            toast.error("Hata oluştu")
        } finally {
            setSearching(false)
            inputRef.current?.focus()
        }
    }

    // ... addItem, removeItem unchanged ...
    const addItem = (product: PosProduct) => {
        setItems(prev => {
            const existing = prev.find(i => i.variantId === product.variantId)
            if (existing) {
                return prev.map(i => i.variantId === product.variantId ? { ...i, quantity: i.quantity + 1 } : i)
            }
            return [{
                variantId: product.variantId,
                barcode: product.barcode,
                modelName: product.modelName + (product.color ? ` (${product.color}/${product.size})` : ""),
                price: product.price,
                quantity: 1
            }, ...prev]
        })
    }

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.variantId !== id))
    }

    const handleStoreSelect = (storeId: string) => {
        if (validationStep === 1) {
            setFirstSelection(storeId)
            setValidationStep(2)
            toast.info("GÜVENLİK: Lütfen hedef mağazayı tekrar seçiniz.")
        } else {
            // Step 2
            if (storeId === firstSelection) {
                // MATCH! Proceed
                setSelectedTargetStore(storeId)
                executeTransfer(storeId)
            } else {
                // MISMATCH
                toast.error("Mağaza seçimi eşleşmedi! İşlem en başa alındı.", { duration: 3000 })
                resetValidation()
            }
        }
    }

    const executeTransfer = async (targetId: string) => {
        setTransferring(true)
        try {
            const result = await transferStock(items, currentStoreId, targetId, currentStaffId)

            if (result.success) {
                const targetStoreName = allStores.find(s => s.id === targetId)?.name
                const itemCount = items.reduce((a, b) => a + b.quantity, 0)

                toast.success(`${itemCount} adet ürün ${targetStoreName} mağazasına başarıyla gönderildi!`, {
                    duration: 5000,
                    style: { background: "#10b981", color: "white", fontWeight: "bold" } // Green
                })

                setItems([])
                setConfirmOpen(false)
                setIsOpen(false)
                resetValidation()
            } else {
                toast.error(result.error || "Transfer yapılamadı")
                resetValidation() // Reset on error too to be safe? Or keep step 2? Reset better.
            }
        } catch (err) {
            toast.error("Kritik hata")
        } finally {
            setTransferring(false)
        }
    }

    if (!isOpen) {
        return (
            <Button
                variant="default"
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 shadow-lg"
                onClick={() => setIsOpen(true)}
            >
                <Truck className="mr-2 h-5 w-5" />
                Hızlı Transfer
            </Button>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-blue-200 dark:border-blue-900 overflow-hidden flex flex-col h-full animate-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="bg-blue-600 text-white p-3 flex justify-between items-center shrink-0">
                <div className="font-bold flex items-center gap-2">
                    <Truck className="h-5 w-5" /> Hızlı Transfer
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-blue-100 hover:text-white hover:bg-blue-700 h-6 w-6 p-0 rounded-full">
                    X
                </Button>
            </div>

            {/* Input */}
            <div className="p-3 bg-blue-50 dark:bg-gray-900/50 shrink-0">
                <form onSubmit={handleScan} className="relative">
                    <Input
                        ref={inputRef}
                        placeholder="Barkod okutun..."
                        value={barcode}
                        onChange={e => setBarcode(e.target.value)}
                        className="pr-10 border-blue-200 focus:ring-blue-500"
                        autoFocus
                    />
                    {searching ? (
                        <div className="absolute right-3 top-3 h-4 w-4 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" />
                    ) : (
                        <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    )}
                </form>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-2 space-y-2 min-h-0 bg-gray-50 dark:bg-gray-900/20">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm p-4 text-center">
                        <Box className="h-10 w-10 mb-2 opacity-50" />
                        Ürün okutarak listeyi doldurun.
                    </div>
                ) : (
                    items.map((item, idx) => (
                        <div key={item.variantId} className="bg-white dark:bg-gray-800 p-2 rounded border shadow-sm flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2">
                            <div className="overflow-hidden">
                                <div className="font-bold truncate">{item.modelName}</div>
                                <div className="text-xs text-muted-foreground">{item.barcode}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-xs">
                                    x{item.quantity}
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => removeItem(item.variantId)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer / Action */}
            <div className="p-3 border-t bg-white dark:bg-gray-800 shrink-0">
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={items.length === 0}
                    onClick={() => { setConfirmOpen(true); resetValidation(); }}
                >
                    Transferi Tamamla <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>


            {/* Dialog: Select Store - DOUBLE BLIND */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className={validationStep === 2 ? "text-red-600 font-bold" : ""}>
                            {validationStep === 1 ? "1. Adım: Hedef Mağaza Seçin" : "2. Adım: ONAY İÇİN TEKRAR SEÇİN"}
                        </DialogTitle>
                        <DialogDescription>
                            {validationStep === 1
                                ? "Bu ürünler hangi şubeye transfer ediliyor?"
                                : "Güvenlik gereği lütfen hedef mağazayı tekrar seçerek doğrulayın."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3 py-4">
                        {allStores.filter(s => s.id !== currentStoreId).map(store => (
                            <Button
                                key={store.id}
                                variant="outline"
                                className={`h-16 text-lg hover:border-blue-400 hover:bg-blue-50 transition-all ${transferring ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={() => handleStoreSelect(store.id)}
                            >
                                {store.name}
                            </Button>
                        ))}
                    </div>

                    <div className="bg-gray-50 p-3 rounded text-xs text-gray-500 mb-4 flex justify-between items-center">
                        <div>
                            <strong>Özet:</strong> {items.reduce((a, b) => a + b.quantity, 0)} adet ürün.
                        </div>
                        <div className="text-xs font-mono">
                            Adım: {validationStep}/2
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmOpen(false)}>İptal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
