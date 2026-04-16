"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Check, Truck, AlertTriangle, PackageCheck } from "lucide-react"

import { TransferProductGrid } from "../products/transfer-product-grid"

interface TransferDetailProps {
    transfer: {
        id: string
        transferNo: string
        status: string
        createdAt: string | Date
        sourceStore: { name: string, id: string }
        targetStore: { name: string, id: string }
        items: Array<{
            id: string
            quantitySent: number
            quantityReceived: number | null
            variantId: string
            variant: {
                barcode: string
                size: string
                color: { name: string, id: string, model: { name: string, id: string, brand?: string, category?: string, seasonType?: string, seasonYear?: string } }
                stocks?: any[]
            }
        }>
    }
}

export function TransferDetailView({ transfer }: TransferDetailProps) {
    // Data Transformation for Grid
    const gridProducts = transfer.items.reduce((acc: any[], item: any) => {
        const p = item.variant.color.model
        const color = item.variant.color

        let product = acc.find(p_ => p_.id === p.id)
        if (!product) {
            product = {
                ...p,
                createdAt: new Date(transfer.createdAt),
                colors: []
            }
            acc.push(product)
        }

        let productColor = product.colors.find((c: any) => c.id === color.id)
        if (!productColor) {
            productColor = { ...color, variants: [] }
            product.colors.push(productColor)
        }

        productColor.variants.push({
            ...item.variant,
            transferQuantity: item.quantitySent,
            stocks: item.variant.stocks || []
        })

        return acc
    }, [])

    return (
        <div className="max-w-7xl mx-auto space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        {transfer.transferNo}
                        {(transfer.status === "PENDING" || transfer.status === "RECOMMENDED") && <Badge variant="secondary">BEKLİYOR</Badge>}
                        {transfer.status === "COMPLETED" && <Badge className="bg-green-600 hover:bg-green-700">TAMAMLANDI</Badge>}
                        {transfer.status === "ABORT" && <Badge variant="destructive">İPTAL</Badge>}
                        {transfer.status === "CANCELLED" && <Badge variant="destructive">İPTAL</Badge>}
                        {transfer.status === "SENT" && <Badge className="bg-orange-500">YOLDA</Badge>}
                    </h1>
                    <div className="flex flex-col mt-2 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{transfer.sourceStore.name}</span>
                            <Truck className="w-4 h-4" />
                            <span className="font-semibold text-foreground">{transfer.targetStore.name}</span>
                        </div>
                        <span className="text-sm mt-1">
                            {new Date(transfer.createdAt).toLocaleString("tr-TR", {
                                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                        </span>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Grid View */}
            <div className="flex-1 min-h-0 border rounded-lg bg-white overflow-hidden">
                <TransferProductGrid
                    products={gridProducts}
                    stores={[transfer.sourceStore, transfer.targetStore]}
                    facets={(() => {
                        const data = gridProducts.flatMap(p => 
                            p.colors.flatMap((c: any) => 
                                c.variants.map((v: any) => ({ ...v, ...p, color: c.name }))
                            )
                        );
                        const brands = Array.from(new Set(data.map((d: any) => d.brand).filter(Boolean))).map(v => ({ value: v as string, count: 0, checked: false }));
                        const categories = Array.from(new Set(data.map((d: any) => d.category).filter(Boolean))).map(v => ({ value: v as string, count: 0, checked: false }));
                        const seasonTypes = Array.from(new Set(data.map((d: any) => d.seasonType).filter(Boolean))).map(v => ({ value: v as string, count: 0, checked: false }));
                        const seasonYears = Array.from(new Set(data.map((d: any) => d.seasonYear).filter(Boolean))).map(v => ({ value: v as string, count: 0, checked: false }));
                        return { brands, categories, seasonTypes, seasonYears };
                    })()}
                    totalCount={transfer.items.length}
                />
            </div>
        </div>
    )
}
