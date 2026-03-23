"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gift, Copy, History, AlertCircle, ArrowUpRight, Trash2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CreateGiftCardDialog } from "./create-gift-card-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { cancelGiftCard } from "@/actions/crm/gift-card-actions"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function GiftCardList({ customer, giftCards, highlightId }: { customer: any, giftCards: any[], highlightId?: string | null }) {
    const [filter, setFilter] = useState<'ACTIVE' | 'PASSIVE'>('ACTIVE')
    const [loading, setLoading] = useState<string | null>(null)

    // Handle Deep Linking / Highlighting
    useEffect(() => {
        if (highlightId) {
            const targetCard = giftCards.find(c => c.id === highlightId)
            if (targetCard) {
                // Determine status to switch tab
                const isExpired = new Date() > new Date(targetCard.expiryDate)
                const hasBalance = targetCard.type === "PERCENTAGE" || Number(targetCard.remainingBalance) > 0
                const isActive = targetCard.isActive && hasBalance && !isExpired

                setFilter(isActive ? 'ACTIVE' : 'PASSIVE')

                // Scroll to item after a short delay to allow tab switch rendering
                setTimeout(() => {
                    const el = document.getElementById(`gc-${highlightId}`)
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                }, 100)
            }
        }
    }, [highlightId, giftCards])

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast.success("Kod kopyalandı!")
    }

    const handleCancel = async (id: string) => {
        setLoading(id)
        const res = await cancelGiftCard(id)
        setLoading(null)
        if (res.success) {
            toast.success("Hediye çeki iptal edildi.")
        } else {
            toast.error(res.error || "İptal başarısız oldu.")
        }
    }

    const filteredCards = giftCards.filter(card => {
        const isExpired = new Date() > new Date(card.expiryDate)
        const hasBalance = card.type === "PERCENTAGE" || Number(card.remainingBalance) > 0
        const isActive = card.isActive && hasBalance && !isExpired

        if (filter === 'ACTIVE') return isActive
        if (filter === 'PASSIVE') return !isActive
        return true
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-[400px]">
                    <TabsList>
                        <TabsTrigger value="ACTIVE">Aktif Çekler</TabsTrigger>
                        <TabsTrigger value="PASSIVE">Geçmiş/Pasif</TabsTrigger>
                    </TabsList>
                </Tabs>
                <CreateGiftCardDialog customerId={customer.id} customerName={customer.name} />
            </div>

            <div className="space-y-3">
                {filteredCards.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10 bg-gray-50 rounded-lg border border-dashed">
                        {filter === 'ACTIVE' ? (
                            <>
                                <Gift className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>Aktif hediye çeki bulunmuyor.</p>
                            </>
                        ) : (
                            <p>Geçmiş hediye çeki kaydı yok.</p>
                        )}
                    </div>
                ) : (
                    filteredCards.map(card => {
                        const isExpired = new Date() > new Date(card.expiryDate)
                        const hasBalance = card.type === "PERCENTAGE" || Number(card.remainingBalance) > 0
                        const isActive = card.isActive && hasBalance && !isExpired

                        // Determine why it's passive
                        let passiveReason = ""
                        let usageInfo = null
                        if (!isActive) {
                            if (!card.isActive) passiveReason = "Manuel İptal"
                            else if (isExpired) passiveReason = "Süresi Doldu"
                            else if (!hasBalance) {
                                passiveReason = "Tükendi"
                                // Find usage
                                const payments = card.salePayments || []
                                if (payments.length > 0) {
                                    usageInfo = payments.map((p: any) => ({
                                        amount: p.amount,
                                        date: new Date(p.createdAt),
                                        saleTotal: p.sale?.totalAmount
                                    }))
                                }
                            }
                        }

                        const isHighlighted = highlightId === card.id

                        return (
                            <div
                                id={`gc-${card.id}`}
                                key={card.id}
                                className={`flex flex-col gap-3 p-4 border rounded-lg shadow-sm transition-all duration-500 
                                    ${isActive ? 'bg-white' : 'bg-gray-50 opacity-80'}
                                    ${isHighlighted ? 'border-blue-500 ring-2 ring-blue-200 scale-[1.02]' : (isActive ? 'border-blue-100' : 'border-gray-200')}
                                `}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${isActive ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'}`}>
                                            <Gift className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-base font-bold tracking-wider text-gray-900">{card.code}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-700" onClick={() => copyCode(card.code)}>
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <div suppressHydrationWarning className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                <History className="w-3 h-3" />
                                                Son Kullanma: {card.expiryDate ? new Date(card.expiryDate).toLocaleDateString('tr-TR') : '-'}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                {card.campaign ? (
                                                    <>
                                                        <Tag className="w-3 h-3 text-indigo-500" />
                                                        <span className="text-indigo-600 font-medium">{card.campaign.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Gift className="w-3 h-3 opacity-50" />
                                                        <span className="opacity-75">Manuel Oluşturuldu</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right flex flex-col items-end gap-1">
                                        <div className={`text-lg font-bold ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                            {card.type === "FIXED_AMOUNT"
                                                ? formatCurrency(card.remainingBalance)
                                                : `%${card.percentage}`
                                            }
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                            {card.type === "FIXED_AMOUNT" ? "Bakiye" : "İndirim"}
                                        </div>

                                        {isActive && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 mt-1 text-[10px]">
                                                        <Trash2 className="w-3 h-3 mr-1" /> İptal Et
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Hediye Çekini İptal Et?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Bu işlem geri alınamaz. <strong>{card.code}</strong> kodlu çek pasif duruma getirilecek ve bir daha kullanılamayacak.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleCancel(card.id)} className="bg-red-600 hover:bg-red-700">
                                                            Evet, İptal Et
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Detail for Passive/Used Cards */}
                                {!isActive && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-gray-200 text-gray-700 hover:bg-gray-200">
                                                {passiveReason}
                                            </Badge>
                                            {card.type === "FIXED_AMOUNT" && (
                                                <span className="text-muted-foreground">İlk Tutar: {formatCurrency(card.initialAmount)}</span>
                                            )}
                                        </div>

                                        {usageInfo && usageInfo.length > 0 && (
                                            <div className="space-y-1 mt-2">
                                                <div className="font-semibold text-gray-700 flex items-center gap-1">
                                                    <ArrowUpRight className="w-3 h-3" /> Kullanım Geçmişi:
                                                </div>
                                                {usageInfo.map((u: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between pl-4 text-gray-500">
                                                        <span suppressHydrationWarning>{u.date ? new Date(u.date).toLocaleDateString('tr-TR') : '-'} tarihli satışta</span>
                                                        <span className="font-medium text-gray-700">-{formatCurrency(u.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
