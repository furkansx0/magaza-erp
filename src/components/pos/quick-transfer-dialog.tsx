"use client"

import type { TransferItem } from '@/types/actions';
﻿import * as React from "react"
import { Search, ArrowRight, Truck, Check, Trash2, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { searchPosProducts } from '@/actions/pos/pos-actions'
import { PosProduct } from "@/types/pos"
import { transferStock } from '@/actions/inventory/transfer-actions'
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface QuickTransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentStoreId: string;
    allStores: { id: string; name: string }[];
    currentStaffId: string;
}

export function QuickTransferDialog({ open, onOpenChange, currentStoreId, allStores, currentStaffId }: QuickTransferDialogProps) {
    // === STATE ===
    // Mode: SCANNING or CONFIRMING
    const [mode, setMode] = React.useState<'SCANNING' | 'CONFIRMING'>('SCANNING');

    // Scan State
    const [barcode, setBarcode] = React.useState("")
    const [items, setItems] = React.useState<TransferItem[]>([])
    const [searching, setSearching] = React.useState(false) // Spinner for input
    const [transferring, setTransferring] = React.useState(false) // Final submit

    // Confirmation State (Double Blind)
    const [validationStep, setValidationStep] = React.useState<1 | 2>(1)
    const [firstSelection, setFirstSelection] = React.useState<string | null>(null)

    const inputRef = React.useRef<HTMLInputElement>(null)

    // === HANDLERS ===

    // Reset when closed
    React.useEffect(() => {
        if (!open) {
            setItems([])
            setBarcode("")
            setMode('SCANNING')
            setValidationStep(1)
            setFirstSelection(null)
        } else {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [open])

    const handleBarcodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!barcode.trim()) return

        setSearching(true)
        try {
            const results = await searchPosProducts(barcode, currentStoreId)

            if (results && results.length > 0) {
                // Determine best match (exact barcode first)
                const match = results.find(p => p.barcode === barcode) || results[0];
                addItem(match);
                setBarcode("");
            } else {
                toast.error("Ürün bulunamadı");
            }
        } catch (error) {
            toast.error("Hata oluştu");
        } finally {
            setSearching(false)
            inputRef.current?.focus()
        }
    }

    const addItem = (product: PosProduct) => {
        setItems(prev => {
            const existing = prev.find(i => i.variantId === product.variantId)
            if (existing) {
                // Check stock
                /* if (existing.quantity >= product.stock) {
                    toast.warning("Yetersiz stok limitine yaklaştınız");
                } */
                return prev.map(i => i.variantId === product.variantId ? { ...i, quantity: i.quantity + 1 } : i)
            }
            return [{
                variantId: product.variantId,
                modelName: product.modelName,
                barcode: product.barcode,
                quantity: 1, // Start with 1
                currentStock: product.stock,
                price: 0
            }, ...prev]
        })
    }

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.variantId !== id))
    }

    // Double Blind Logic
    const handleStoreSelect = async (targetId: string) => {
        if (validationStep === 1) {
            setFirstSelection(targetId)
            setValidationStep(2)
            toast.info("Lütfen güvenliğiniz için mağazayı TEKRAR seçiniz.")
        } else {
            // Check match
            if (targetId === firstSelection) {
                // Valid! Execute Transfer
                await executeTransfer(targetId)
            } else {
                // Mismatch
                toast.error("Mağaza seçimleri eşleşmedi! İşlem iptal edildi.")
                // Reset
                setValidationStep(1)
                setFirstSelection(null)
                setMode('SCANNING') // Go back to start? Or stay in Confirming? Resetting to Step 1 Confirming is handled by state. But maybe nicer to show error.
            }
        }
    }

    const executeTransfer = async (targetId: string) => {
        setTransferring(true)
        try {
            const targetStoreName = allStores.find(s => s.id === targetId)?.name;
            const res = await transferStock(
                items.map(i => ({
                    variantId: i.variantId,
                    quantity: i.quantity,
                    barcode: i.barcode, // Required by type
                    modelName: i.modelName, // Required by type
                    price: 0 // Dummy, not used in logic but required by Type? Let's check type.
                    // TransferItem definition in actions has: variantId, barcode, modelName, price, quantity.
                    // The logic uses them for error messages and logs.
                    // I must pass them.
                })),
                currentStoreId,
                targetId,
                currentStaffId
            );

            if (res.success) {
                toast.success(`Transfer Başarılı! (${items.length} Kalem -> ${targetStoreName})`);
                onOpenChange(false); // Close dialog
            } else {
                toast.error("Hata: " + res.error);
                setValidationStep(1); // Reset confirmation if failed
                setFirstSelection(null);
            }
        } catch (error) {
            toast.error("Beklenmedik bir hata oluştu");
        } finally {
            setTransferring(false)
        }
    }

    // === RENDER HELPERS ===

    const renderScanningMode = () => (
        <div className="flex flex-col h-full animate-in slide-in-from-left-4 fade-in duration-300">
            <div className="p-4 border-b bg-gray-50 dark:bg-gray-900">
                <form onSubmit={handleBarcodeSubmit} className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${searching ? 'animate-pulse text-blue-500' : ''}`} />
                    <Input
                        ref={inputRef}
                        placeholder="Okutun veya Barkod Yazıp Enter'a basın..."
                        value={barcode}
                        onChange={e => setBarcode(e.target.value)}
                        className="pl-10 h-12 text-lg"
                        autoFocus
                        disabled={transferring}
                    />
                </form>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-2 bg-gray-100/50 dark:bg-black/20">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40">
                        <Truck className="h-16 w-16 mb-4" />
                        <p className="text-lg">Transfer edilecek ürünleri ekleyin</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.variantId} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border flex justify-between items-center animate-in slide-in-from-bottom-2">
                            <div>
                                <div className="font-bold text-gray-800 dark:text-gray-100">{item.modelName}</div>
                                <div className="text-xs text-muted-foreground font-mono">{item.barcode}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold border border-blue-100">
                                    x{item.quantity}
                                </div>
                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeItem(item.variantId)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t bg-white dark:bg-gray-900">
                <Button
                    className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-lg transition-all"
                    disabled={items.length === 0}
                    onClick={() => setMode('CONFIRMING')}
                >
                    Transferi Başlat ({items.length} Ürün) <ArrowRight className="ml-2" />
                </Button>
            </div>
        </div>
    );

    const renderConfirmingMode = () => (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="p-6 text-center border-b">
                <h2 className={cn("text-2xl font-bold", validationStep === 2 ? "text-red-600 animate-pulse" : "text-gray-800")}>
                    {validationStep === 1 ? "1. Adım: Hangi Mağazaya?" : "2. Adım: ONAY İÇİN TEKRAR SEÇİN"}
                </h2>
                <p className="text-muted-foreground mt-2">
                    {validationStep === 1 ? "Lütfen hedef mağazayı seçiniz." : "Güvenlik gereği seçiminizi doğrulayın."}
                </p>
            </div>

            <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-4">
                {allStores.filter(s => s.id !== currentStoreId).map(store => (
                    <Button
                        key={store.id}
                        variant="outline"
                        className={cn(
                            "h-full min-h-[100px] text-xl font-bold flex flex-col items-center justify-center gap-2 border-2 hover:border-blue-500 hover:bg-blue-50 transition-all",
                            transferring && "opacity-50 pointer-events-none"
                        )}
                        onClick={() => handleStoreSelect(store.id)}
                    >
                        <Truck className="h-8 w-8 opacity-50" />
                        {store.name}
                    </Button>
                ))}
            </div>

            <div className="p-4 border-t">
                <Button variant="secondary" className="w-full" onClick={() => {
                    setMode('SCANNING');
                    setValidationStep(1);
                    setFirstSelection(null);
                }}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Listeye Dön
                </Button>
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[70vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-gray-900 border-none shadow-2xl">

                {/* Header */}
                <div className="bg-blue-600 text-white p-4 shrink-0 flex justify-between items-center">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Truck className="h-6 w-6" />
                        Hızlı Mağaza Transferi
                    </DialogTitle>
                    {/* Duplicate X Removed */}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col relative">
                    {/* MODE: SCANNING */}
                    {mode === 'SCANNING' && renderScanningMode()}

                    {/* MODE: CONFIRMING (Double Blind) */}
                    {mode === 'CONFIRMING' && renderConfirmingMode()}
                </div>
            </DialogContent>
        </Dialog>
    )
}
