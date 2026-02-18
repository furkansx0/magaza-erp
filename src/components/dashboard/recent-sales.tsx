"use client"

import { useState } from "react"
import { SaleDetailDialog } from "./sale-detail-dialog"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Users, Clock } from "lucide-react"

export function RecentSales({ sales }: { sales: any[] }) {
    const [selectedSale, setSelectedSale] = useState<any | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    const handleSaleClick = (sale: any) => {
        setSelectedSale(sale)
        setDetailOpen(true)
    }

    if (sales.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Henüz satış yapılmadı ve raporlanacak veri yok.</p>
    }

    return (
        <>
            <div className="divide-y">
                {sales.map((sale) => (
                    <div
                        key={sale.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group"
                        onClick={() => handleSaleClick(sale)}
                    >
                        <div className="flex flex-col gap-1 mb-2 sm:mb-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                    {sale.customer ? sale.customer.name : "Misafir Müşteri"}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:bg-white transition-colors border">
                                    {sale.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0} Ürün
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(sale.createdAt), "HH:mm", { locale: tr })}
                                </span>
                                <span>•</span>
                                {/* Cashier removed as per request */}
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="font-bold text-lg text-indigo-600">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(sale.totalAmount))}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {sale.payments?.map((p: any) => p.method).join(', ') || sale.paymentMethod}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <SaleDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                sale={selectedSale}
            />
        </>
    )
}
