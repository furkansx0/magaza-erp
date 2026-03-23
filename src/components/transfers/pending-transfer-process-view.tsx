"use client"

import type { ProductWithVariants } from '@/types/actions';
﻿
import React, { useEffect, useState, useRef } from "react"
import { StockTransfer, StockTransferItem, ProductVariant, ProductModel, Store } from "@prisma/client"
import { TransferProductGrid } from "@/components/products/transfer-product-grid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CheckCircle, Barcode, ArrowRight, Save } from "lucide-react"
import { toast } from "sonner"
import { completeTransfer } from '@/actions/inventory/transfer-recommendation-actions'
import { useRouter } from "next/navigation"


// Helper to transform Transfer Items to ProductWithVariants for the Grid
function transformToGridData(items: (StockTransferItem & { variant: ProductVariant & { model: ProductModel } })[], scannedMap: Record<string, number>): ProductWithVariants[] {
    const productMap = new Map<string, ProductWithVariants>()

    items.forEach(item => {
        const p = item.variant.model
        if (!productMap.has(p.id)) {
            productMap.set(p.id, {
                ...p,
                variants: [],
                _count: { variants: 0 }
            } as any)
        }

        const product = productMap.get(p.id)!

        // Construct variant with "injected" stock for the grid columns
        const variantWithStocks = {
            ...item.variant,
            stocks: [
                { storeId: "planned", quantity: item.quantitySent },
                { storeId: "scanned", quantity: scannedMap[item.variantId] || 0 }
            ]
        }
        product.variants.push(variantWithStocks as any)
    })

    return Array.from(productMap.values())
}

interface PendingTransferProcessViewProps {
    transfer: StockTransfer & {
        sourceStore: Store
        targetStore: Store
        items: (StockTransferItem & { variant: ProductVariant & { model: ProductModel } })[]
    }
}

export function PendingTransferProcessView({ transfer }: PendingTransferProcessViewProps) {
    const router = useRouter()
    const [scannedMap, setScannedMap] = useState<Record<string, number>>({})
    const [barcodeInput, setBarcodeInput] = useState("")
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Handle Barcode Scan
    const handleScan = (e: React.FormEvent) => {
        e.preventDefault()
        if (!barcodeInput.trim()) return

        const code = barcodeInput.trim()

        // Find variant by barcode
        const item = transfer.items.find(i => i.variant.barcode === code || i.variant.sku === code)

        if (item) {
            setScannedMap(prev => ({
                ...prev,
                [item.variantId]: (prev[item.variantId] || 0) + 1
            }))
            toast.success(`${item.variant.model.name} (${item.variant.size}/${item.variant.color}) okundu.`)
            setBarcodeInput("")
        } else {
            toast.error("Bu transferde böyle bir ürün yok.")
        }
    }

    // Auto-Focus
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleComplete = async () => {
        const totalPlanned = transfer.items.reduce((acc, i) => acc + i.quantitySent, 0)
        const totalScanned = Object.values(scannedMap).reduce((acc, q) => acc + q, 0)

        if (totalScanned === 0) {
            if (!confirm("Hiçbir ürün okutmadınız. Transfer iptal mi edilecek? (Şu an sadece tamamla var)")) return
        }

        if (totalScanned !== totalPlanned) {
            if (!confirm(`Planlanan (${totalPlanned}) ile Okunan (${totalScanned}) eşleşmiyor. Yine de devam edilsin mi?`)) return
        }

        setLoading(true)
        try {
            const verifiedItems = Object.entries(scannedMap).map(([variantId, quantity]) => ({ variantId, quantity }))

            const res = await completeTransfer(transfer.id, verifiedItems)
            if (res.success) {
                toast.success(res.message)
                router.refresh()
                router.push("/dashboard/transfers")
            } else {
                toast.error(res.error)
            }
        } finally {
            setLoading(false)
        }
    }

    // Auto-fill all (helper)
    const handleAutoFill = () => {
        if (!confirm("Bütün ürünleri 'okundu' olarak işaretlemek istiyor musunuz?")) return
        const newMap: Record<string, number> = {}
        transfer.items.forEach(i => {
            newMap[i.variantId] = i.quantitySent
        })
        setScannedMap(newMap)
    }

    const gridData = transformToGridData(transfer.items, scannedMap)

    const dummyStores = [
        { id: "planned", name: "Planlanan" },
        { id: "scanned", name: "Okunan" }
    ]

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
            <Card className="flex-none p-4 bg-blue-50/50 border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                            Transfer Kabul: {transfer.transferNo}
                        </h2>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <span>{transfer.sourceStore.name}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{transfer.targetStore.name}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <form onSubmit={handleScan} className="flex items-center gap-2">
                            <div className="relative">
                                <Barcode className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    ref={inputRef}
                                    value={barcodeInput}
                                    onChange={(e) => setBarcodeInput(e.target.value)}
                                    placeholder="Barkod okutun..."
                                    className="pl-8 bg-white w-[200px]"
                                    autoFocus
                                />
                            </div>
                            <Button type="submit" variant="secondary">Ekle</Button>
                        </form>
                        <div className="w-[1px] h-8 bg-gray-300 mx-2" />
                        <Button variant="outline" onClick={handleAutoFill}>Hepsini Al</Button>
                        <Button onClick={handleComplete} disabled={loading} className="bg-green-600 hover:bg-green-700">
                            <Save className="w-4 h-4 mr-2" />
                            Tamamla
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="flex-1 border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                <div className="p-2 bg-gray-50 border-b text-xs font-semibold text-gray-500">
                    Hazırlık ve Kontrol Listesi
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <div className="absolute inset-0">
                        <TransferProductGrid
                            products={gridData}
                            stores={dummyStores}
                            facets={{ brands: [], categories: [], seasons: [] }}
                            totalCount={gridData.length}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
