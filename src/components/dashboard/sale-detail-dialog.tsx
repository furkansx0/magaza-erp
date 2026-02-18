"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { CreditCard, Banknote, Gift, User, Calendar, Receipt } from "lucide-react"

interface SaleDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sale: any
}

export function SaleDetailDialog({ open, onOpenChange, sale }: SaleDetailDialogProps) {
    if (!sale) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Receipt className="h-5 w-5 text-indigo-600" />
                        Satış Detayı #{sale.id.slice(-6)}
                    </DialogTitle>
                    <DialogDescription>
                        {format(new Date(sale.createdAt), "d MMMM yyyy HH:mm", { locale: tr })} tarihinde yapılan işlem.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
                    {/* Customer & Cashier Info */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Müşteri & Personel
                            </h3>
                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Müşteri:</span>
                                    <span className="font-medium">{sale.customer ? sale.customer.name : "Misafir Müşteri"}</span>
                                </div>
                                {sale.customer?.phone && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Telefon:</span>
                                        <span>{sale.customer.phone}</span>
                                    </div>
                                )}
                                {/* REMOVED Sales Rep Summary as per user request */}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Mağaza:</span>
                                    <span>{sale.store?.name || "Merkez"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Ödeme Detayları
                            </h3>
                            <div className="space-y-2">
                                {sale.payments && sale.payments.length > 0 ? (
                                    sale.payments.map((p: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-sm border-b last:border-0 pb-1 last:pb-0 border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                {p.method === "CASH" && <Banknote className="h-3 w-3 text-green-600" />}
                                                {p.method === "CREDIT_CARD" && <CreditCard className="h-3 w-3 text-blue-600" />}
                                                {p.method === "GIFT_CARD" && <Gift className="h-3 w-3 text-purple-600" />}
                                                <span>
                                                    {p.method === "CASH" && "Nakit"}
                                                    {p.method === "CREDIT_CARD" && "Kredi Kartı"}
                                                    {p.method === "GIFT_CARD" && "Hediye Çeki"}
                                                </span>
                                            </div>
                                            <span className="font-mono font-bold">
                                                {Number(p.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex justify-between items-center text-sm">
                                        <span>
                                            {sale.paymentMethod === "CASH" ? "Nakit" :
                                                sale.paymentMethod === "CREDIT_CARD" ? "Kredi Kartı" : "Karma / Diğer"}
                                        </span>
                                        <span className="font-bold">
                                            {Number(sale.totalAmount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2 mt-2 border-t font-bold text-lg">
                                    <span>TOPLAM</span>
                                    <span className="text-indigo-600">
                                        {Number(sale.totalAmount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div>
                    <h3 className="font-semibold mb-2">Satılan Ürünler</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-gray-900">
                                    <TableHead>Ürün</TableHead>
                                    <TableHead>Varyant</TableHead>
                                    <TableHead>Satış Temsilcisi</TableHead>
                                    <TableHead className="text-right">Birim Fiyat</TableHead>
                                    <TableHead className="text-center">Adet</TableHead>
                                    <TableHead className="text-right">Tutar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sale.items?.map((item: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">
                                            {item.variant?.model?.name || "Ürün Silinmiş"}
                                            <div className="text-xs text-muted-foreground">{item.variant?.barcode}</div>
                                        </TableCell>
                                        <TableCell>
                                            {item.variant ? (
                                                <Badge variant="secondary" className="font-normal">
                                                    {item.variant.size} / {item.variant.color}
                                                </Badge>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {item.salesRepName || "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {Number(item.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right font-bold font-mono">
                                            {Number(Number(item.price) * item.quantity).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    )
}
