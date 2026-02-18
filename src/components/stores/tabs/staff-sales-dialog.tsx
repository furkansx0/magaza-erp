"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateRangeType, getStaffSales } from "@/actions/settings/store-reporting-actions"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { SaleDetailDialog } from "@/components/dashboard/sale-detail-dialog"

interface StaffSalesHistoryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    storeId: string
    staff: { id: string, name: string } | null
    dateRange: {
        range: DateRangeType
        customStart?: Date
        customEnd?: Date
    }
}

export function StaffSalesHistoryDialog({ open, onOpenChange, storeId, staff, dateRange }: StaffSalesHistoryDialogProps) {
    const [sales, setSales] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedSale, setSelectedSale] = useState<any>(null)

    useEffect(() => {
        if (open && staff) {
            setLoading(true)
            getStaffSales(storeId, staff.id, dateRange)
                .then(data => setSales(data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false))
        } else {
            setSales([]) // Clear on close
        }
    }, [open, staff, storeId, dateRange])

    // Filter out sales where staff is just a cashier? 
    // No, logic is OR, so we show all involved. User can see details.

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[800px] h-[80vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="flex flex-col gap-1">
                            <span>{staff?.name} - Satış Geçmişi</span>
                            <span className="text-sm font-normal text-muted-foreground mr-1">
                                {dateRange.range === 'today' ? "Bugün" :
                                    dateRange.range === 'yesterday' ? "Dün" :
                                        "Seçili Tarih Aralığı"}
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto p-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    {/* <TableHead>İşlem No</TableHead> REMOVED */}
                                    <TableHead>Tip</TableHead>
                                    <TableHead className="text-right">Tutar</TableHead>
                                    <TableHead className="w-[40px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    ))
                                ) : sales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Bu tarih aralığında personelin dahil olduğu işlem bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sales.map((sale) => (
                                        <TableRow
                                            key={sale.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setSelectedSale(sale)}
                                        >
                                            <TableCell className="font-medium">
                                                {format(new Date(sale.createdAt), "dd MMM HH:mm", { locale: tr })}
                                            </TableCell>
                                            {/* <TableCell className="font-mono text-xs text-muted-foreground">
                                                {sale.id.slice(0, 8)}
                                            </TableCell> REMOVED */}
                                            <TableCell>
                                                <Badge variant={sale.type === 'RETURN' ? 'destructive' : sale.type === 'EXCHANGE' ? 'outline' : 'default'}
                                                    className={sale.type === 'EXCHANGE' ? 'border-orange-500 text-orange-600 bg-orange-50' : ''}>
                                                    {sale.type === 'RETURN' ? 'İADE' : sale.type === 'EXCHANGE' ? 'DEĞİŞİM' : 'SATIŞ'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(sale.totalAmount)}
                                            </TableCell>
                                            <TableCell>
                                                <Search className="h-4 w-4 text-muted-foreground opacity-50" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            <SaleDetailDialog
                open={!!selectedSale}
                sale={selectedSale}
                onOpenChange={(open) => !open && setSelectedSale(null)}
            />
        </>
    )
}
