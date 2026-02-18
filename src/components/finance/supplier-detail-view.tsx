"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toggleTransactionStatus } from "@/actions/finance/finance-actions"
import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface TransactionRaw {
    id: string
    type: number
    amount: any // Decimal
    transactionDate: Date
    dueDate: Date | null
    description: string | null
    isPaid: boolean // New
    paidAt: Date | null // New
}

export function SupplierDetailView({ transactions }: { transactions: TransactionRaw[] }) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

    const handleTogglePay = async (id: string, currentStatus: boolean) => {
        setLoadingMap(prev => ({ ...prev, [id]: true }))
        const res = await toggleTransactionStatus(id, !currentStatus)
        setLoadingMap(prev => ({ ...prev, [id]: false }))

        if (res.success) {
            toast.success(currentStatus ? "Ödeme geri alındı." : "Ödeme yapıldı olarak işaretlendi.")
        } else {
            toast.error("İşlem başarısız.")
        }
    }

    return (
        <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50/50">
                    <TableRow>
                        <TableHead className="w-[110px]">İşlem Tarihi</TableHead>
                        <TableHead className="w-[80px]">Belge No</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead className="w-[100px]">Vade Tarihi</TableHead>
                        <TableHead className="text-right w-[120px]">Tutar</TableHead>
                        <TableHead className="w-[100px] text-center">Durum</TableHead>
                        <TableHead className="w-[100px] text-center">İşlem</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                Henüz işlem kaydı yok.
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((t) => {
                            const isPaid = t.isPaid;
                            return (
                                <TableRow key={t.id} className={cn("hover:bg-muted/30 transition-colors", isPaid && "bg-gray-50/50 text-gray-400 opacity-70")}>
                                    <TableCell className="font-medium text-xs">
                                        {format(new Date(t.transactionDate), "d MMM yy", { locale: tr })}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">
                                        {(t as any).documentNo || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn("text-sm text-gray-900", isPaid && "line-through text-gray-400")}>{t.description || "-"}</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {t.dueDate ? (
                                            <span className={cn(!isPaid && new Date(t.dueDate) < new Date() ? "text-red-600 font-bold" : "")}>
                                                {format(new Date(t.dueDate), "d MMM yy", { locale: tr })}
                                            </span>
                                        ) : "-"}
                                    </TableCell>

                                    <TableCell className="text-right font-medium">
                                        {Number(t.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        {isPaid ? (
                                            <div className="flex items-center justify-center gap-1 text-green-600 text-xs font-medium bg-green-50 py-1 rounded-full">
                                                <CheckCircle2 className="h-3 w-3" /> Ödendi
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-medium bg-amber-50 py-1 rounded-full">
                                                <Circle className="h-3 w-3" /> Bekliyor
                                            </div>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Button
                                            size="sm"
                                            variant={isPaid ? "outline" : "default"}
                                            className={cn("h-7 text-xs w-full", isPaid ? "text-gray-500" : "bg-green-600 hover:bg-green-700")}
                                            onClick={() => handleTogglePay(t.id, isPaid)}
                                            disabled={loadingMap[t.id]}
                                        >
                                            {loadingMap[t.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : (isPaid ? "İptal" : "Öde")}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
