"use client"

import * as React from "react"
import { Search, Loader2, Package, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { searchPosProducts } from "@/actions/pos/pos-actions"
import type { PosProduct } from "@/types/pos"
// Removed unused import

// Assuming useDebounce doesn't exist yet, I'll implement a simple one inside or assume standard library.
// I'll implement a simple standard debounce effect inside the component.

interface ProductSearchProps {
    onSelect: (product: PosProduct) => void;
    storeId?: string; // New: Optional explicit store context
    includeOutOfStock?: boolean; // New: Allow searching all products even if 0 stock
}

export function ProductSearch({ onSelect, storeId, includeOutOfStock }: ProductSearchProps) {
    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<PosProduct[]>([])
    const [loading, setLoading] = React.useState(false)
    const [open, setOpen] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Debounce Logic
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true)
                try {
                    const data = await searchPosProducts(query, storeId, includeOutOfStock)
                    setResults(data)
                    setOpen(true)

                    // Auto-select if exact barcode match (1 result and exact match)
                    if (data.length === 1 && data[0].barcode === query) {
                        onSelect(data[0])
                        setQuery("") // Reset scan
                        setOpen(false)
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

    const handleSelect = (product: PosProduct) => {
        onSelect(product)
        setQuery("")
        setOpen(false)
        inputRef.current?.focus()
    }

    return (
        <div className="relative w-full z-50">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    autoFocus
                    placeholder="Ürün Barkodu, Adı veya SKU Ara..."
                    className="h-14 pl-12 text-lg shadow-sm border-2 border-indigo-100 focus:border-indigo-500 rounded-xl bg-white"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && results.length > 0) {
                            handleSelect(results[0]) // Select first on enter
                        }
                    }}
                />
                {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    </div>
                )}
            </div>

            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 space-y-1">
                        {results.map((product) => (
                            <div
                                key={product.variantId}
                                onClick={() => handleSelect(product)}
                                className="flex items-center gap-4 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg cursor-pointer transition-colors group"
                            >
                                <div className="h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xl shrink-0">
                                    ğŸ‘•
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                        {product.modelName}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-mono">
                                            {product.barcode}
                                        </Badge>
                                        <span>{product.color} / {product.size}</span>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="font-bold text-lg text-indigo-600">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}
                                    </div>
                                    <div className={cn("text-xs font-medium", product.stock > 0 ? "text-green-600" : "text-red-500")}>
                                        {product.stock > 0 ? `${product.stock} Adet Stok` : "Stok Tükendi"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {open && results.length === 0 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 p-8 text-center rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 text-muted-foreground animate-in fade-in zoom-in-95">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Ürün bulunamadı.</p>
                </div>
            )}
        </div>
    )
}
