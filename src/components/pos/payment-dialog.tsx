"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Banknote, CreditCard, Gift, AlertCircle, Loader2, PartyPopper } from "lucide-react"
import { toast } from "sonner"
import type { PaymentInput } from "@/types/pos"
import { validateGiftCard } from "@/actions/crm/gift-card-actions"

interface PaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    totalAmount: number
    onComplete: (payments: PaymentInput[]) => void
    isLoading: boolean
    customer?: any // Changed from customerId to customer object
}

export function PaymentDialog({ open, onOpenChange, totalAmount, onComplete, isLoading, customer }: PaymentDialogProps) {
    // Amounts
    const [cashAmount, setCashAmount] = React.useState("")
    const [cardAmount, setCardAmount] = React.useState("")
    const [giftAmount, setGiftAmount] = React.useState("")

    // Gift Card State
    const [giftCode, setGiftCode] = React.useState("")
    const [isGiftValid, setIsGiftValid] = React.useState(false)
    const [giftError, setGiftError] = React.useState("")
    const [activeGiftCard, setActiveGiftCard] = React.useState<{
        balance: number,
        owner: string,
        type: string,
        percentage?: number
    } | null>(null)

    // Selection Dialog State
    const [showGiftList, setShowGiftList] = React.useState(false)

    // Calculated
    const totalInput = (Number(cashAmount) || 0) + (Number(cardAmount) || 0) + (Number(giftAmount) || 0)
    // If totalAmount is negative, remaining technically is negative. 
    // Logic: If totalAmount < 0, we require 0 payment. 
    // Status should be "Complete" if totalInput is 0 (or anything, really, but usually 0).

    let isComplete = false;
    let remaining = 0;

    if (totalAmount < 0) {
        // Exchange with forfeit. Always complete.
        isComplete = true; // Auto-complete allowed
        remaining = totalAmount; // Just for display
    } else {
        remaining = totalAmount - totalInput
        isComplete = Math.abs(remaining) < 0.01
    }

    const handleVerifyGift = async (codeToVerify?: string) => {
        // ... (unchanged)
        const code = codeToVerify || giftCode;

        setGiftError("");
        setActiveGiftCard(null);
        setIsGiftValid(false);
        setGiftAmount("");

        if (!customer) {
            setGiftError("Hediye çeki kullanmak için müşteri seçmelisiniz.");
            return;
        }

        const res = await validateGiftCard(code, customer.id);
        if (res.success && res.card) {
            const card = res.card;
            setActiveGiftCard({
                balance: card.balance,
                owner: card.ownerName,
                type: card.type,
                percentage: card.percentage || undefined
            });
            setIsGiftValid(true);
            setGiftCode(code);

            if (card.type === "PERCENTAGE" && card.percentage) {
                // Auto-Calculate Percentage Discount
                const discount = (totalAmount * card.percentage) / 100;
                setGiftAmount(discount.toFixed(2));
                toast.success(`%${card.percentage} İndirim Uygulandı!`);
            } else {
                toast.success(`Çek Onaylandı: ${card.balance} TL`);
            }
        } else {
            setGiftError(res.error || "Geçersiz kod");
        }
    }

    const handleApplyFromList = (code: string) => {
        setGiftCode(code);
        setShowGiftList(false);
        handleVerifyGift(code);
    }

    const handleSubmit = () => {
        if (!isComplete) return;

        const payments: PaymentInput[] = []
        if (Number(cashAmount) > 0) payments.push({ method: "CASH", amount: Number(cashAmount) })
        if (Number(cardAmount) > 0) payments.push({ method: "CREDIT_CARD", amount: Number(cardAmount) })
        if (Number(giftAmount) > 0 && isGiftValid) {
            payments.push({ method: "GIFT_CARD", amount: Number(giftAmount), referenceCode: giftCode })
        }

        onComplete(payments)
    }

    const setMax = (setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (totalAmount < 0) return; // No payment needed
        setter(prev => {
            const current = Number(prev) || 0
            return (current + remaining).toFixed(2)
        })
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex justify-between items-center">
                            <span>Ödeme Al</span>
                            <span className={totalAmount < 0 ? "text-orange-600" : "text-indigo-600"}>
                                {totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Status Bar */}
                        {totalAmount < 0 ? (
                            <div className="p-3 rounded-lg text-center font-bold border bg-orange-50 text-orange-800 border-orange-200">
                                Müşteri Alacaklı: {Math.abs(totalAmount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                <br />
                                <span className="text-xs font-normal text-orange-700">Para iadesi yapılmaz. İşlem bu şekilde tamamlanacaktır.</span>
                            </div>
                        ) : (
                            <div className={`p-3 rounded-lg text-center font-medium border ${remaining > 0 ? "bg-orange-50 text-orange-700 border-orange-200" :
                                remaining < -0.01 ? "bg-red-50 text-red-700 border-red-200" :
                                    "bg-green-50 text-green-700 border-green-200"
                                }`}>
                                {remaining > 0 && `Kalan Tutar: ${remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`}
                                {remaining < -0.01 && `Fazla Tutar: ${Math.abs(remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`}
                                {Math.abs(remaining) <= 0.01 && "Ödeme Tamamlandı âœ…"}
                            </div>
                        )}

                        {/* Inputs (Disable if negative total, or optional?) Let's disable to prevent confusion */}
                        <div className={totalAmount < 0 ? "opacity-50 pointer-events-none grayscale" : ""}>
                            {/* ... Inputs ... */}
                            <div className="space-y-4">
                                {/* 1. Cash */}
                                <div className="grid gap-2">
                                    {/* ... */}
                                    <Label>Nakit</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Banknote className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                            <Input
                                                className="pl-9"
                                                placeholder="0.00"
                                                value={cashAmount}
                                                onChange={e => setCashAmount(e.target.value)}
                                                type="number"
                                            />
                                        </div>
                                        <Button variant="outline" onClick={() => setMax(setCashAmount)}>Tümü</Button>
                                    </div>
                                </div>

                                {/* 2. Credit Card */}
                                <div className="grid gap-2">
                                    <Label>Kredi Kartı</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                            <Input
                                                className="pl-9"
                                                placeholder="0.00"
                                                value={cardAmount}
                                                onChange={e => setCardAmount(e.target.value)}
                                                type="number"
                                            />
                                        </div>
                                        <Button variant="outline" onClick={() => setMax(setCardAmount)}>Tümü</Button>
                                    </div>
                                </div>

                                {/* 3. Gift Card */}
                                <div className="grid gap-2 border-t pt-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="flex items-center gap-2">
                                            <Gift className="h-4 w-4 text-purple-600" />
                                            Hediye Çeki
                                        </Label>

                                        {/* Link for Available Checks */}
                                        {customer && customer.giftCards && customer.giftCards.length > 0 && !isGiftValid && (
                                            <Button
                                                variant="link"
                                                className="h-auto p-0 text-purple-600 font-bold text-xs"
                                                onClick={() => setShowGiftList(true)}
                                            >
                                                <PartyPopper className="h-3 w-3 mr-1" />
                                                Müşterinin {customer.giftCards.length} adet çeki var
                                            </Button>
                                        )}
                                    </div>

                                    {!isGiftValid ? (
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Çek Kodu (Örn: GC-X1Y2)"
                                                value={giftCode}
                                                onChange={e => setGiftCode(e.target.value.toUpperCase())}
                                            />
                                            <Button variant="secondary" onClick={() => handleVerifyGift()}>Doğrula</Button>
                                        </div>
                                    ) : (
                                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 flex flex-col gap-2">
                                            <div className="flex justify-between text-sm text-purple-800">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">{giftCode}</span>
                                                    {activeGiftCard?.type === "PERCENTAGE" && (
                                                        <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded text-xs">
                                                            %{activeGiftCard.percentage} İNDİRİM
                                                        </span>
                                                    )}
                                                </div>
                                                <span>
                                                    {activeGiftCard?.type === "FIXED_AMOUNT"
                                                        ? `Bakiye: ${Number(activeGiftCard.balance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`
                                                        : `Otomatik Uygulandı`}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    className="bg-white h-8"
                                                    placeholder="Kullanılacak Tutar"
                                                    value={giftAmount}
                                                    onChange={e => {
                                                        const val = Number(e.target.value);
                                                        if (activeGiftCard?.type === "FIXED_AMOUNT" && val > (activeGiftCard?.balance || 0)) return;
                                                        setGiftAmount(e.target.value);
                                                    }}
                                                    // DISABLE if PERCENTAGE
                                                    disabled={activeGiftCard?.type === "PERCENTAGE"}
                                                    type="number"
                                                />
                                                <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => {
                                                    setIsGiftValid(false); setGiftAmount(""); setGiftCode("");
                                                }}>İptal</Button>
                                            </div>
                                        </div>
                                    )}
                                    {giftError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {giftError}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-between">
                        <div className="text-xs text-muted-foreground flex items-center">
                            {!customer && Math.abs(remaining) > 0 && <span className="opacity-70">Hediye çeki için müşteri seçiniz.</span>}
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || !isComplete}
                            className={isComplete ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Satışı Tamamla
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Gift Card List Dialog (Nested/Secondary) */}
            <Dialog open={showGiftList} onOpenChange={setShowGiftList}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Müşteri Hediye Çekleri</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto">
                        {customer?.giftCards?.map((card: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-purple-50 transition-colors">
                                <div>
                                    <div className="font-bold flex items-center gap-2">
                                        {card.code}
                                        {card.type === "PERCENTAGE" && <span className="text-[10px] bg-purple-200 text-purple-700 px-1 rounded">%{card.percentage}</span>}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        SKT: {new Date(card.expiryDate).toLocaleDateString('tr-TR')}
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    <div className="font-bold text-green-600">
                                        {card.type === "FIXED_AMOUNT"
                                            ? Number(card.remainingBalance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
                                            : `%${card.percentage}`
                                        }
                                    </div>
                                    <Button size="sm" onClick={() => handleApplyFromList(card.code)}>
                                        Uygula
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
