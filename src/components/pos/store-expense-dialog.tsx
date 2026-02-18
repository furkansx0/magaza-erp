"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addStoreExpense, getDailyStoreExpenses } from "@/actions/finance/expense-actions"
import { getStoreCashBalance } from "@/actions/finance/cash-actions"
import { Loader2, Plus, Coins, Receipt } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

interface StoreExpenseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    storeId: string
}

export function StoreExpenseDialog({ open, onOpenChange, storeId }: StoreExpenseDialogProps) {
    const [amount, setAmount] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [loading, setLoading] = React.useState(false)

    const [expenses, setExpenses] = React.useState<{ id: string, amount: number, description: string, createdAt: Date }[]>([])
    const [total, setTotal] = React.useState(0)

    // New: Balance State
    const [currentBalance, setCurrentBalance] = React.useState(0)
    const [loadingBalance, setLoadingBalance] = React.useState(true)

    // Load expenses when dialog opens
    React.useEffect(() => {
        if (open && storeId) {
            loadExpenses()
            loadBalance()
        }
    }, [open, storeId])

    const loadBalance = async () => {
        setLoadingBalance(true)
        const res = await getStoreCashBalance(storeId)
        setCurrentBalance(res.balance || 0)
        setLoadingBalance(false)
    }

    const loadExpenses = async () => {
        const data = await getDailyStoreExpenses(storeId)
        setExpenses(data)
        setTotal(data.reduce((sum, item) => sum + item.amount, 0))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || !description) {
            toast.error("Lütfen tutar ve açıklama giriniz.");
            return;
        }

        setLoading(true)
        try {
            const res = await addStoreExpense({
                amount: Number(amount),
                description,
                storeId
            })

            if (res.success) {
                toast.success("Gider kaydedildi")
                setAmount("")
                setDescription("")
                loadExpenses() // Refresh list
                loadBalance() // Refresh balance
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
                    <DialogTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-orange-600" />
                        Mağaza Giderleri (Günlük)
                    </DialogTitle>
                    <DialogDescription>
                        Kasa çıkışı gerektiren günlük harcamaları buradan giriniz.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Left: Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 border-r pr-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Tutar (TL)</Label>
                                <span className="text-xs text-muted-foreground font-medium">
                                    Mevcut: {loadingBalance ? "..." : formatCurrency(currentBalance)}
                                </span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₺</span>
                                <Input
                                    className="pl-8 text-lg font-bold"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    autoFocus
                                // max={currentBalance} // Removed to relying on manual check for better UX
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Açıklama</Label>
                            <Input
                                placeholder="Örn: Yemek ücreti, Kargo ödemesi..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Gider Ekle
                        </Button>
                    </form>

                    {/* Right: List */}
                    <div className="flex flex-col h-full max-h-[400px]">
                        <h4 className="font-semibold mb-3 text-sm flex justify-between items-center">
                            <span>Bugünün Giderleri</span>
                            <span className="text-orange-600 font-bold">{formatCurrency(total)}</span>
                        </h4>

                        <div className="flex-1 overflow-y-auto border rounded-md bg-gray-50 p-2 space-y-2">
                            {expenses.length === 0 ? (
                                <div className="text-center text-muted-foreground text-xs py-10">
                                    Bugün henüz gider girilmemiş.
                                </div>
                            ) : (
                                expenses.map(exp => (
                                    <div key={exp.id} className="bg-white p-2 rounded shadow-sm border flex justify-between items-center text-sm">
                                        <div>
                                            <div className="font-medium">{exp.description}</div>
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(exp.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className="font-bold text-orange-700">
                                            -{formatCurrency(exp.amount)}
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
