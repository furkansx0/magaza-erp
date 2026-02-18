"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Plus, RefreshCw, Lock, Unlock, AlertTriangle } from "lucide-react"
import { format, addMonths } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { addTransactionBatch } from "@/actions/finance/finance-actions"
import { toast } from "sonner"
import { FormattedNumberInput } from "@/components/ui/formatted-number-input"

interface PlanItem {
    id: number
    date: Date
    amount: number
    description: string
    documentNo?: string
}

export function AddTransactionDialog({ supplierId }: { supplierId: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [mainTab, setMainTab] = useState("purchase") // purchase | payment

    // Common Inputs
    const [totalAmount, setTotalAmount] = useState("")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState<Date>(new Date())

    // Purchase Specific
    const [purchaseType, setPurchaseType] = useState("credit") // cash | credit
    const [installmentCount, setInstallmentCount] = useState("1")
    const [firstDueDate, setFirstDueDate] = useState<Date>(new Date())
    const [downPayment, setDownPayment] = useState("") // Peşinat

    // Payment Specific
    const [paymentType, setPaymentType] = useState("cash") // cash | check
    const [checkCount, setCheckCount] = useState("1")
    const [checkStartMonth, setCheckStartMonth] = useState<Date>(new Date())
    const [checkDocumentStart, setCheckDocumentStart] = useState("")

    // The Plan
    const [plan, setPlan] = useState<PlanItem[]>([])
    const [isManualMode, setIsManualMode] = useState(false)

    // Effect to generate plan automatically
    useEffect(() => {
        if (!isManualMode) {
            generatePlan()
        }
    }, [mainTab, totalAmount, purchaseType, installmentCount, firstDueDate, paymentType, checkCount, checkStartMonth, checkDocumentStart, description, isManualMode, downPayment])

    const generatePlan = () => {
        const amount = parseFloat(totalAmount)
        const dp = parseFloat(downPayment) || 0

        if (isNaN(amount) || amount <= 0) {
            setPlan([])
            return
        }

        const items: PlanItem[] = []

        if (mainTab === "purchase") {
            if (purchaseType === "cash") {
                // Cash Purchase
                items.push({
                    id: 1,
                    date: date,
                    amount: amount,
                    description: description || "Peşin Mal Alışı",
                    documentNo: checkDocumentStart
                })
            } else {
                // Credit (Vadeli)

                // 1. Handle Down Payment (Peşinat) if exists
                if (dp > 0) {
                    items.push({
                        id: 0,
                        date: date, // Peşinat is due today (Invoice Date)
                        amount: dp,
                        description: `${description || "Vadeli Alış"} - Peşinat`,
                        documentNo: checkDocumentStart
                    })
                }

                // 2. Handle Installments from Remaining Amount
                const remainingAmount = amount - dp

                if (remainingAmount > 0) {
                    const count = parseInt(installmentCount) || 1
                    const perInstallment = remainingAmount / count

                    for (let i = 0; i < count; i++) {
                        const d = addMonths(firstDueDate, i)
                        items.push({
                            id: i + 1,
                            date: d,
                            amount: perInstallment,
                            description: `${description || "Vadeli Alış"} - Taksit ${i + 1}/${count}`,
                            documentNo: checkDocumentStart
                        })
                    }
                }
            }
        } else {
            // PAYMENT Logic
            if (paymentType === "cash") {
                items.push({
                    id: 1,
                    date: date,
                    amount: amount,
                    description: description || "Nakit Ödeme",
                    documentNo: checkDocumentStart
                })
            } else {
                // Check (Çek)
                const count = parseInt(checkCount) || 1
                const perCheck = amount / count

                for (let i = 0; i < count; i++) {
                    const d = addMonths(checkStartMonth, i)
                    items.push({
                        id: i + 1,
                        date: d,
                        amount: perCheck,
                        description: `${description || "Çek Ödemesi"} - ${i + 1}/${count}`,
                        documentNo: checkDocumentStart ? String(parseInt(checkDocumentStart) + i) : ""
                    })
                }
            }
        }
        setPlan(items)
    }

    const handlePlanChange = (index: number, field: keyof PlanItem, value: any) => {
        if (!isManualMode) return

        const newPlan = [...plan]
        newPlan[index] = { ...newPlan[index], [field]: value }
        setPlan(newPlan)
    }

    const toggleManualMode = () => {
        if (isManualMode) {
            setIsManualMode(false)
        } else {
            setIsManualMode(true)
        }
    }

    const planSum = plan.reduce((acc, item) => acc + (item.amount || 0), 0)
    const targetAmount = parseFloat(totalAmount) || 0
    const difference = targetAmount - planSum
    const isBalanced = Math.abs(difference) < 0.01

    const handleSubmit = async () => {
        if (plan.length === 0) return

        if (isManualMode && !isBalanced) {
            toast.error(`Plan toplamı (${planSum.toFixed(2)}) ile ana tutar (${targetAmount.toFixed(2)}) eşleşmiyor!`)
            return
        }

        setLoading(true)

        const transactionsToSave = []

        // Generic Save Logic:
        // Purchase Tab -> All items are Debts (Type 0)
        // Payment Tab -> All items are Payments (Type 1)

        const type = mainTab === "purchase" ? 0 : 1;

        plan.forEach(p => {
            transactionsToSave.push({
                type: type,
                amount: p.amount,
                description: p.description,
                date: date, // Transaction Date
                dueDate: p.date, // Due Date
                documentNo: p.documentNo
            })
        })

        const res = await addTransactionBatch({ supplierId, transactions: transactionsToSave })

        setLoading(false)

        if (res.success) {
            toast.success(res.message)
            setOpen(false)
            setTotalAmount("")
            setDescription("")
            setDownPayment("")
            setIsManualMode(false)
        } else {
            toast.error(res.message)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 text-white hover:bg-slate-800">
                    <Plus className="mr-2 h-4 w-4" /> Yeni İşlem Ekle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
                    <DialogTitle>Yeni Finansal İşlem</DialogTitle>
                    <DialogDescription>
                        Cari hesap hareketi veya ödeme planı oluşturun.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
                    {/* LEFT COLUMN: SETUP */}
                    <div className="p-6 overflow-y-auto border-r bg-white space-y-6">
                        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="purchase" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600">
                                    Mal/Hizmet Alışı
                                </TabsTrigger>
                                <TabsTrigger value="payment" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-600">
                                    Ödeme / Çıkış
                                </TabsTrigger>
                            </TabsList>

                            <div className="space-y-4">
                                {/* Common Inputs */}
                                <div className="space-y-2">
                                    <Label>Toplam Tutar</Label>
                                    <FormattedNumberInput
                                        placeholder="0,00"
                                        value={totalAmount}
                                        onValueChange={(val) => setTotalAmount(val ? val.toString() : "")}
                                        className={cn("text-2xl font-bold h-14", mainTab === 'purchase' ? "text-red-600" : "text-green-600")}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Belge / Fatura No</Label>
                                        <Input
                                            placeholder={mainTab === "purchase" ? "Fatura No" : "Makbuz No"}
                                            value={checkDocumentStart}
                                            onChange={e => setCheckDocumentStart(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>İşlem Tarihi</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full text-left font-normal">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {format(date, "d MMM yyyy", { locale: tr })}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Genel Açıklama</Label>
                                    <Input
                                        placeholder="Örn: X Firması Mal Alımı"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </div>

                                {/* Dynamic Fields */}
                                <TabsContent value="purchase" className="space-y-4 pt-2">
                                    <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                                        <div className="flex gap-4">
                                            <div className="space-y-2 flex-1">
                                                <Label>Alış Tipi</Label>
                                                <Select value={purchaseType} onValueChange={setPurchaseType}>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="credit">Vadeli / Taksitli</SelectItem>
                                                        <SelectItem value="cash">Peşin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {purchaseType === "credit" && (
                                                <div className="space-y-2 flex-1">
                                                    <Label>Peşinat (Opsiyonel)</Label>
                                                    <FormattedNumberInput
                                                        placeholder="Peşinat var ise giriniz"
                                                        value={downPayment}
                                                        onValueChange={(val) => setDownPayment(val ? val.toString() : "")}
                                                        className="bg-white"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {purchaseType === "credit" && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Vade (Taksit) Sayısı</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        className="bg-white"
                                                        value={installmentCount}
                                                        onChange={e => setInstallmentCount(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>İlk Vade Başlangıcı</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" className="w-full text-left font-normal bg-white">
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {format(firstDueDate, "d MMM yyyy", { locale: tr })}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar mode="single" selected={firstDueDate} onSelect={(d) => d && setFirstDueDate(d)} />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="payment" className="space-y-4 pt-2">
                                    <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                                        <div className="space-y-2">
                                            <Label>Ödeme Yöntemi</Label>
                                            <Select value={paymentType} onValueChange={setPaymentType}>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Nakit / Havale</SelectItem>
                                                    <SelectItem value="check">Çek / Senet</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {paymentType === "check" && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Çek Sayısı</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        className="bg-white"
                                                        value={checkCount}
                                                        onChange={e => setCheckCount(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>İlk Çek Tarihi</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" className="w-full text-left font-normal bg-white">
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {format(checkStartMonth, "d MMM yyyy", { locale: tr })}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar mode="single" selected={checkStartMonth} onSelect={(d) => d && setCheckStartMonth(d)} />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>

                    {/* RIGHT COLUMN: PLAN PREVIEW / EDIT */}
                    <div className="p-6 overflow-hidden flex flex-col bg-gray-50/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                {isManualMode ? <Unlock className="h-4 w-4 text-amber-600" /> : <Lock className="h-4 w-4 text-gray-400" />}
                                Ödeme Planı
                            </h3>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={toggleManualMode}
                                    className={isManualMode ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" : ""}
                                >
                                    {isManualMode ? "Otomatik Moda Dön" : "Özel Düzenleme Aç"}
                                </Button>
                            </div>
                        </div>

                        {/* List Wrapper with Grid Header */}

                        <div className="grid grid-cols-[3rem_1fr_6rem] gap-2 px-4 py-2 text-xs font-semibold text-gray-400 border-b bg-white rounded-t-xl">
                            <div className="text-center">#</div>
                            <div>Açıklama / Tarih</div>
                            <div className="text-right">Tutar</div>
                        </div>

                        <div className="flex-1 overflow-y-auto border-x border-b rounded-b-xl bg-white shadow-sm p-0">
                            {plan.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                    <RefreshCw className="h-8 w-8 mb-3 opacity-20" />
                                    <p>Tutar ve taksit bilgilerini soldan giriniz.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {plan.map((item, idx) => (
                                        <div key={idx} className={cn(
                                            "grid grid-cols-[3rem_1fr_6rem] gap-2 items-center p-3 text-sm",
                                            isManualMode ? "bg-white" : "bg-gray-50/30"
                                        )}>
                                            <div className="text-center text-xs font-mono text-gray-400">
                                                {idx + 1}
                                            </div>

                                            <div className="min-w-0">
                                                {isManualMode ? (
                                                    <div className="space-y-1">
                                                        <Input
                                                            value={item.description}
                                                            onChange={e => handlePlanChange(idx, "description", e.target.value)}
                                                            className="h-7 text-xs"
                                                            placeholder="Açıklama"
                                                        />
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <button className="text-xs text-gray-500 hover:text-blue-600 underline text-left w-full truncate block">
                                                                    {format(item.date, "d MMM yyyy", { locale: tr })}
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0">
                                                                <Calendar mode="single" selected={item.date} onSelect={(d) => d && handlePlanChange(idx, "date", d)} />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="font-medium text-gray-700 truncate" title={item.description}>
                                                            {item.description}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {format(item.date, "d MMM yyyy", { locale: tr })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-right">
                                                {isManualMode ? (
                                                    <FormattedNumberInput
                                                        value={item.amount}
                                                        onValueChange={(val) => handlePlanChange(idx, "amount", val || 0)}
                                                        className="h-8 font-bold text-right"
                                                    />
                                                ) : (
                                                    <div className={cn(
                                                        "font-bold",
                                                        mainTab === "purchase" ? "text-red-600" : "text-green-600"
                                                    )}>
                                                        {item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Summary Footer in Column */}
                        <div className="mt-4 p-4 rounded-xl border bg-white space-y-2 shadow-sm">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Plan Toplamı:</span>
                                <span className={cn("font-mono font-medium", isBalanced ? "text-gray-900" : "text-red-500")}>
                                    {planSum.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Hedef Tutar:</span>
                                <span className="font-mono font-medium">{targetAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {!isBalanced && (
                                <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-2 font-medium">
                                    <AlertTriangle className="h-3 w-3" />
                                    Fark: {Math.abs(difference).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-gray-50/50 sm:justify-between px-6">
                    <div className="text-xs text-muted-foreground flex items-center">
                        {isManualMode && "Özel düzenleme modu açık. Otomatik hesaplama devre dışı."}
                    </div>
                    <Button type="submit" onClick={handleSubmit} disabled={loading || (isManualMode && !isBalanced)} className="bg-blue-600 hover:bg-blue-700 w-40">
                        {loading ? "Kaydediliyor..." : "Tamamla"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
