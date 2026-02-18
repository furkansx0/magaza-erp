"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

interface TransactionDetailDialogProps {
    transaction: any; // Using simplified type for now, ideally strictly typed shared type
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDialog({ transaction, open, onOpenChange }: TransactionDetailDialogProps) {
    if (!transaction) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>İşlem Detayı #{transaction.id.slice(0, 8)}</DialogTitle>
                    <div className="text-sm text-muted-foreground">
                        {format(new Date(transaction.createdAt), "dd MMMM yyyy HH:mm", { locale: tr })}
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Items List */}
                    <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                        {transaction.items.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 flex justify-between items-center text-sm">
                                <div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-muted-foreground text-xs">{item.variantName}</div>
                                    <div className="text-xs text-indigo-600 font-medium mt-0.5">
                                        {item.salesRepName ? `Satış: ${item.salesRepName}` : ''}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={item.quantity < 0 ? "text-red-500 font-bold" : ""}>
                                        {item.quantity} Adet x {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price)}
                                    </div>
                                    <div className="font-medium">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.total)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-muted/50 p-3 rounded-md space-y-2">
                        <div className="flex justify-between font-medium">
                            <span>Toplam Tutar</span>
                            <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(transaction.totalAmount)}</span>
                        </div>
                        <div className="border-t pt-2 space-y-1">
                            {transaction.payments?.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                                    <span>{p.method === 'CASH' ? 'Nakit' : p.method === 'CREDIT_CARD' ? 'Kredi Kartı' : 'Hediye Çeki'}</span>
                                    <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(p.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Badge variant={transaction.type === 'RETURN' ? 'destructive' : transaction.type === 'EXCHANGE' ? 'secondary' : 'default'}>
                            {transaction.type === 'RETURN' ? 'İADE' : transaction.type === 'EXCHANGE' ? 'DEĞİŞİM' : 'SATIŞ'}
                        </Badge>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
