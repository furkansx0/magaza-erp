"use client"

import * as React from "react"
import { formatCurrency, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, CreditCard, Banknote, Gift, RotateCcw, Box } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

export type SaleHistoryItem = {
    id: string
    date: Date
    storeName: string
    totalAmount: number
    paymentMethods: { method: "CASH" | "CREDIT_CARD" | "GIFT_CARD" | string, amount: number, giftCardId?: string }[]
    cashierName: string
    items: {
        id: string
        name: string
        variantName: string // e.g. "Siyah - L"
        quantity: number
        price: number
        isReturn: boolean
        sku: string
        salesRepName?: string | null // Added
    }[]
    isReturn: boolean
}

function PaymentMethodsBadge({ methods }: { methods: SaleHistoryItem['paymentMethods'] }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const checkClick = (pm: SaleHistoryItem['paymentMethods'][0]) => {
        if (pm.method === 'GIFT_CARD' && pm.giftCardId) {
            const params = new URLSearchParams(searchParams.toString())
            params.set("giftCardId", pm.giftCardId)
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        }
    }

    return (
        <div className="flex gap-2 items-center text-[10px]">
            {methods.map((pm, idx) => (
                <div
                    key={idx}
                    onClick={(e) => {
                        if (pm.method === 'GIFT_CARD' && pm.giftCardId) {
                            e.stopPropagation() // Prevent row expand
                            checkClick(pm)
                        }
                    }}
                    className={`flex items-center gap-1 bg-gray-50 border px-1.5 py-0.5 rounded transition-colors ${pm.method === 'GIFT_CARD' && pm.giftCardId ? 'cursor-pointer hover:bg-purple-100 hover:border-purple-200' : ''}`}
                    title={pm.method}
                >
                    {pm.method === 'CASH' && <Banknote className="w-3 h-3 text-green-600" />}
                    {pm.method === 'CREDIT_CARD' && <CreditCard className="w-3 h-3 text-blue-600" />}
                    {pm.method === 'GIFT_CARD' && <Gift className="w-3 h-3 text-purple-600" />}
                    <span className={`font-mono font-medium ${pm.method === 'GIFT_CARD' ? 'text-purple-700' : ''}`}>{formatCurrency(pm.amount)}</span>
                </div>
            ))}
        </div>
    )
}

export function CustomerSalesHistory({ sales }: { sales: SaleHistoryItem[] }) {
    const [expandedId, setExpandedId] = React.useState<string | null>(null)
    const [currentPage, setCurrentPage] = React.useState(1)
    const pageSize = 100 // "Dense" but safe page size

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id)
    }

    if (sales.length === 0) {
        return <div className="text-center py-10 text-muted-foreground text-sm">Satış geçmişi bulunamadı.</div>
    }

    // Pagination Logic
    const totalPages = Math.ceil(sales.length / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const currentData = sales.slice(startIndex, endIndex)

    const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1))
    const handlePrev = () => setCurrentPage(p => Math.max(1, p - 1))

    return (
        <div className="flex flex-col gap-2">
            <div className="border rounded-md bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow className="hover:bg-gray-50">
                            <TableHead className="w-[30px]"></TableHead>
                            <TableHead className="w-[140px]">Tarih</TableHead>
                            <TableHead className="w-[100px]">Mağaza</TableHead>
                            <TableHead className="text-right">Tutar</TableHead>
                            <TableHead>Ödeme</TableHead>
                            {/* Cashier Removed */}
                            <TableHead className="w-[80px]">Durum</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentData.map(sale => {
                            const isExpanded = expandedId === sale.id

                            return (
                                <React.Fragment key={sale.id}>
                                    <TableRow className={cn("hover:bg-gray-50 cursor-pointer h-10", isExpanded && "bg-blue-50/50")} onClick={() => toggleExpand(sale.id)}>
                                        <TableCell className="py-1 px-2">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="py-1 px-2 text-xs font-mono text-gray-600">
                                            {sale.date.toLocaleDateString("tr-TR")} <span className="text-gray-400">{sale.date.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</span>
                                        </TableCell>
                                        <TableCell className="py-1 px-2">
                                            <Badge variant="outline" className="text-[10px] font-normal bg-white whitespace-nowrap">{sale.storeName}</Badge>
                                        </TableCell>
                                        <TableCell className="py-1 px-2 text-right font-bold text-xs font-mono">
                                            {formatCurrency(sale.totalAmount)}
                                        </TableCell>
                                        <TableCell className="py-1 px-2">
                                            <PaymentMethodsBadge methods={sale.paymentMethods} />
                                        </TableCell>
                                        {/* Cashier Removed */}
                                        <TableCell className="py-1 px-2">
                                            {sale.isReturn ? (
                                                <Badge variant="destructive" className="text-[10px] h-5">İade</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100 h-5">Satış</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>

                                    {isExpanded && (
                                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                            <TableCell colSpan={6} className="p-0 border-b">
                                                <div className="p-3 pl-10 grid gap-2">
                                                    <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                                        <Box className="w-3 h-3" /> Satış Detayı
                                                    </div>
                                                    <div className="bg-white border rounded-md overflow-hidden">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="h-8 border-b-0">
                                                                    <TableHead className="h-8 text-[10px] bg-gray-100/50">SKU</TableHead>
                                                                    <TableHead className="h-8 text-[10px] bg-gray-100/50">Ürün</TableHead>
                                                                    <TableHead className="h-8 text-[10px] bg-gray-100/50">Varyant</TableHead>
                                                                    <TableHead className="h-8 text-[10px] bg-gray-100/50">Satış Temsilcisi</TableHead>
                                                                    <TableHead className="h-8 text-[10px] bg-gray-100/50 text-center">Adet</TableHead>
                                                                    <TableHead className="h-8 text-[10px] bg-gray-100/50 text-right">Birim Fiyat</TableHead>
                                                                    <TableHead className="h-8 text-[10px] bg-gray-100/50 text-right">Toplam</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {sale.items.map((item, idx) => (
                                                                    <TableRow key={idx} className="h-8 border-b-0 hover:bg-transparent">
                                                                        <TableCell className="py-1 text-[10px] font-mono">{item.sku}</TableCell>
                                                                        <TableCell className="py-1 text-[10px] font-medium">{item.name}</TableCell>
                                                                        <TableCell className="py-1 text-[10px] text-muted-foreground">{item.variantName}</TableCell>
                                                                        <TableCell className="py-1 text-[10px] text-indigo-600 font-medium">{item.salesRepName || "-"}</TableCell>
                                                                        <TableCell className="py-1 text-[10px] text-center">{item.quantity}</TableCell>
                                                                        <TableCell className="py-1 text-[10px] text-right font-mono">{formatCurrency(item.price)}</TableCell>
                                                                        <TableCell className="py-1 text-[10px] text-right font-mono font-bold">{formatCurrency(item.price * item.quantity)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-gray-500 px-2">
                    <div>
                        Toplam <strong>{sales.length}</strong> işlem kaydı. (Sayfa {currentPage} / {totalPages})
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentPage === 1} className="h-7 text-xs">Previous</Button>
                        <Button variant="outline" size="sm" onClick={handleNext} disabled={currentPage === totalPages} className="h-7 text-xs">Next</Button>
                    </div>
                </div>
            )}
        </div>
    )
}
