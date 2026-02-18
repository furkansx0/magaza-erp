"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addCashClosing, getDailyCashClosings } from "@/actions/finance/cash-closing-actions"
import { getStoreCashBalance } from "@/actions/finance/cash-actions"
import { Loader2, Plus, Banknote, History } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, cn } from "@/lib/utils"

interface CashClosingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    storeId: string
    staffId: string // Current logged in staff
}

export function CashClosingDialog({ open, onOpenChange, storeId, staffId }: CashClosingDialogProps) {
    const [amount, setAmount] = React.useState("")
    const [note, setNote] = React.useState("")
    const [loading, setLoading] = React.useState(false)

    const [closings, setClosings] = React.useState<{ id: string, coutedCash: number, difference: number | null, note: string | null, createdAt: Date, cashierName: string }[]>([])

    // Balance State
    const [systemBalance, setSystemBalance] = React.useState(0)
    const [loadingBalance, setLoadingBalance] = React.useState(true)

    // Load closings when dialog opens
    React.useEffect(() => {
        if (open && storeId) {
            loadClosings()
            loadBalance()
        }
    }, [open, storeId])

    const loadBalance = async () => {
        setLoadingBalance(true)
        const res = await getStoreCashBalance(storeId)
        setSystemBalance(res.balance || 0)
        setLoadingBalance(false)
    }

    const loadClosings = async () => {
        const data = await getDailyCashClosings(storeId)
        setClosings(data)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount) return

        setLoading(true)
        try {
            const counted = Number(amount);
            const diff = counted - systemBalance;

            const res = await addCashClosing({
                countedCash: counted,
                cashDifference: diff,
                note,
                storeId,
                cashierId: staffId
            })

            if (res.success) {
                toast.success("Nakit sayımı kaydedildi")
                setAmount("")
                setNote("")
                setAmount("")
                setNote("")
                loadClosings() // Refresh list
                loadBalance() // Refresh system balance snapshot
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-700">
                        <Banknote className="h-5 w-5" />
                        Günlük Nakit Sayımı (Kasa Kontrol)
                    </DialogTitle>
                    <DialogDescription>
                        Kasadaki fiziksel nakit tutarını sayıp buraya giriniz. Bu işlem sistemi kapatmaz, sadece kayıt tutar.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Left: Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 border-r pr-6">
                        <div className="space-y-4">
                            {/* Balance Info Box */}
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex justify-between items-center text-sm">
                                <span className="text-indigo-900 font-medium">Sistem Bakiyesi (Dosya):</span>
                                <span className="font-bold text-indigo-700 text-lg">
                                    {loadingBalance ? "..." : formatCurrency(systemBalance)}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <Label>Saydığınız Nakit Tutar (TL)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₺</span>
                                    <Input
                                        className="pl-8 text-lg font-bold border-indigo-200 focus:border-indigo-500 focus:ring-indigo-200"
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                {/* Difference Indicator */}
                                {amount && !loadingBalance && (
                                    <div className={cn("text-xs font-bold px-2 py-1 rounded flex justify-between w-full",
                                        (Number(amount) - systemBalance) === 0 ? "bg-green-100 text-green-700" :
                                            (Number(amount) - systemBalance) < 0 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                    )}>
                                        <span>Fark:</span>
                                        <span>
                                            {(Number(amount) - systemBalance) > 0 ? "+" : ""}
                                            {formatCurrency(Number(amount) - systemBalance)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Not (Opsiyonel)</Label>
                            <Input
                                placeholder="Örn: Vardiya değişimi, Gün sonu..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            />
                        </div>

                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Kaydet
                        </Button>
                    </form>

                    {/* Right: List */}
                    <div className="flex flex-col h-full max-h-[400px]">
                        <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                            <History className="h-4 w-4 text-gray-500" />
                            <span>Bugünün Kayıtları</span>
                        </h4>

                        <div className="flex-1 overflow-y-auto border rounded-md bg-gray-50 p-2 space-y-2">
                            {closings.length === 0 ? (
                                <div className="text-center text-muted-foreground text-xs py-10">
                                    Bugün henüz sayım yapılmamış.
                                </div>
                            ) : (
                                closings.map(c => (
                                    <div key={c.id} className="bg-white p-2 rounded shadow-sm border border-indigo-100 flex flex-col gap-1 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-indigo-700 text-lg">
                                                {formatCurrency(c.coutedCash)}
                                            </span>
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(c.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        {c.difference !== null && c.difference !== 0 && (
                                            <div className={cn("text-xs font-bold text-right",
                                                c.difference < 0 ? "text-red-600" : "text-blue-600"
                                            )}>
                                                Fark: {c.difference > 0 ? "+" : ""}{formatCurrency(c.difference)}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                            <span>{c.cashierName}</span>
                                            {c.note && <span className="italic">"{c.note}"</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
