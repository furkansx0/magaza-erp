import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search, Loader2, Package, AlertCircle } from "lucide-react"
import { checkGlobalStock, ProductStockInfo } from "@/actions/inventory/stock-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function StockQueryPanel() {
    const [query, setQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<ProductStockInfo[]>([])
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true)
                try {
                    const res = await checkGlobalStock(query)
                    if (res.success && res.results) {
                        setResults(res.results)
                        setOpen(true)
                    } else {
                        setResults([])
                    }
                } finally {
                    setLoading(false)
                }
            } else {
                setResults([])
                setOpen(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    return (
        <Card className="h-full flex flex-col overflow-hidden border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Stok Sor
                </CardTitle>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tüm Mağazalarda Ara..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-9 bg-white dark:bg-gray-900"
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-0 flex-1 overflow-auto space-y-3 pr-2">
                {query.length >= 2 && results.length === 0 && !loading && (
                    <div className="text-center text-muted-foreground text-sm py-8 bg-white/50 rounded-xl border border-dashed">
                        Ürün bulunamadı.
                    </div>
                )}

                {results.map((product) => (
                    <div key={product.variantId} className="bg-white dark:bg-gray-900 rounded-xl p-3 border shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                                <div className="font-semibold text-indigo-600 line-clamp-1 text-sm">{product.productName}</div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <Badge variant="secondary" className="px-1 py-0 h-4 text-[10px]">{product.barcode}</Badge>
                                    <span className="truncate">{product.description}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-dashed bg-gray-50/50 -mx-3 -mb-3 p-3 rounded-b-xl">
                            {product.stocks.length > 0 ? (
                                product.stocks.map((stock, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{stock.storeName}</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${stock.stock > 0 ? "bg-green-500" : "bg-red-300"}`} />
                                            <span className={stock.stock > 0 ? "font-bold text-green-700 dark:text-green-400" : "text-red-400"}>
                                                {stock.stock} Adet
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-red-500 text-center font-medium">Stok bilgisi yok</div>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
