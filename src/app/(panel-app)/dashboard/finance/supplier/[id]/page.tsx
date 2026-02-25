import { getSupplier, getSupplierTransactionsRaw } from "@/actions/finance/finance-actions"
import { SupplierDetailView } from "@/components/finance/supplier-detail-view"
import { AddTransactionDialog } from "@/components/finance/add-transaction-dialog"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supplier = await getSupplier(id)

    if (!supplier) notFound()

    const transactions = await getSupplierTransactionsRaw(id)

    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    let overdue = 0;
    let upcoming = 0;

    // Calculate current balance (Only Unpaid Debts)
    const balance = transactions.reduce((acc, t) => {
        if (t.isPaid) return acc; // Skip paid transactions

        const val = Number(t.amount);

        // Calculate Overdue & Upcoming
        if (t.dueDate) {
            const due = new Date(t.dueDate);
            if (due < today) {
                overdue += val;
            } else if (due <= nextMonth) {
                upcoming += val;
            }
        }

        return acc + val;
    }, 0);

    return (
        <div className="min-h-full bg-gray-50/30 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="h-10 w-10">
                        <Link href="/dashboard/finance">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
                        <div className="flex gap-4 text-sm text-gray-500 mt-1">
                            {supplier.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {supplier.phone}
                                </span>
                            )}
                            {supplier.address && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {supplier.address}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    {/* Overdue */}
                    <div className="text-right bg-white p-3 rounded-xl border shadow-sm min-w-[140px]">
                        <div className="text-sm text-gray-500 font-medium">Vadesi Geçen</div>
                        <div className="text-lg font-bold text-red-600">
                            {overdue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">Acil Ödenmeli</div>
                    </div>

                    {/* Upcoming */}
                    <div className="text-right bg-white p-3 rounded-xl border shadow-sm min-w-[140px]">
                        <div className="text-sm text-gray-500 font-medium">Gelecek Ay</div>
                        <div className="text-lg font-bold text-amber-600">
                            {upcoming.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">Planlanmalı</div>
                    </div>

                    {/* Total Balance */}
                    <div className="text-right bg-slate-900 p-3 rounded-xl border shadow-sm min-w-[160px]">
                        <div className="text-sm text-slate-400 font-medium">Güncel Bakiye</div>
                        <div className="text-2xl font-black text-white">
                            {balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            {balance >= 0 ? "Toplam Borç" : "Alacak"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Action Bar & Form */}
            <div className="sticky top-0 z-10 -mx-6 px-6 pt-4 bg-gray-50/95 backdrop-blur border-b pb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Hesap Hareketleri</h2>
                <AddTransactionDialog supplierId={supplier.id} />
            </div>

            {/* Transaction History Grid */}
            <div className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-800 ml-1">Hesap Ekstresi</h2>
                <SupplierDetailView transactions={transactions} />
            </div>
        </div>
    )
}
