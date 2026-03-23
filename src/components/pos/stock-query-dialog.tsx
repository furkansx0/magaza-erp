"use client"

import type { ProductStockInfo } from '@/types/actions';
﻿import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { checkGlobalStock } from '@/actions/inventory/stock-actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface StockQueryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function StockQueryDialog({ open, onOpenChange }: StockQueryDialogProps) {
    const [query, setQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<ProductStockInfo[]>([])

    // Clear query when closed? Maybe keep it.
    useEffect(() => {
        if (open && query.length === 0) {
            // Auto focus or something?
        }
    }, [open])

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true)
                try {
                    const res = await checkGlobalStock(query)
                    if (res.success && res.results) {
                        setResults(res.results)
                    } else {
                        setResults([])
                    }
                } finally {
                    setLoading(false)
                }
            } else {
                setResults([])
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-gray-900">
                <DialogHeader className="p-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-indigo-600" />
                        Stok Sorgulama
                    </DialogTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Ürün adı, barkod veya SKU..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9 bg-gray-50 dark:bg-gray-800 border-indigo-100 focus:border-indigo-500"
                            autoFocus
                        />
                        {loading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-4 bg-gray-50/50 dark:bg-gray-950/50">
                    {query.length >= 2 && results.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                            <Search className="h-12 w-12 mb-2" />
                            <p>Ürün bulunamadı.</p>
                        </div>
                    )}

                    {query.length < 2 && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-40">
                            <Search className="h-12 w-12 mb-2" />
                            <p>Aramak için en az 2 karakter girin.</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {results.map((product) => (
                            <div key={product.variantId} className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-3 border-b border-dashed flex justify-between items-start gap-4">
                                    <div className="min-w-0">
                                        <div className="font-bold text-lg text-indigo-700">{product.productName}</div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                {product.barcode}
                                            </Badge>
                                            <span className="text-sm text-gray-500">{product.description}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number((product as any).salePrice || (product as any).price || 0))}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50/50 dark:bg-gray-800/20 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {product.stocks.length > 0 ? (
                                        product.stocks.map((stock, idx) => (
                                            <div key={idx} className="flex flex-col p-2 rounded border bg-white dark:bg-gray-900">
                                                <span className="text-xs text-gray-500 truncate">{stock.storeName}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={`w-2 h-2 rounded-full ${stock.stock > 0 ? "bg-green-500" : "bg-red-400"}`} />
                                                    <span className={`font-bold ${stock.stock > 0 ? "text-green-700" : "text-red-400"}`}>
                                                        {stock.stock} Adet
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-3 text-center text-red-500 text-sm py-2">Stok bilgisi yok</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
