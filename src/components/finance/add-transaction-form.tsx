"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Loader2, Plus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { addTransaction } from "@/actions/finance/finance-actions"
import { toast } from "sonner"

export function AddTransactionForm({ supplierId }: { supplierId: string }) {
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState<"0" | "1">("0") // 0=Debt, 1=Payment
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState<Date>(new Date())
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || isNaN(Number(amount))) return toast.error("Geçerli bir tutar giriniz.");

        setLoading(true)
        const res = await addTransaction({
            supplierId,
            type: parseInt(type),
            amount: Number(amount),
            description,
            date,
            dueDate
        })
        setLoading(false)

        if (res.success) {
            toast.success(res.message);
            setAmount("");
            setDescription("");
            setDueDate(undefined);
            setDate(new Date());
        } else {
            toast.error(res.message);
        }
    }

    return (
        <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                    <Plus className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">Hızlı İşlem Ekle</h3>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
                {/* DATE */}
                <div className="flex flex-col gap-1.5 w-full md:w-[150px]">
                    <Label className="text-xs text-gray-500">Tarih</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal h-10",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "d MMM yyyy", { locale: tr }) : "Tarih Seç"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* TYPE */}
                <div className="flex flex-col gap-1.5 w-full md:w-[150px]">
                    <Label className="text-xs text-gray-500">İşlem Tipi</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger className="h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0" className="text-red-600 font-medium">Mal Alışı (Borç)</SelectItem>
                            <SelectItem value="1" className="text-green-600 font-medium">Ödeme (Çıkış)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* AMOUNT */}
                <div className="flex flex-col gap-1.5 w-full md:w-[120px]">
                    <Label className="text-xs text-gray-500">Tutar</Label>
                    <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10 font-bold"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                </div>

                {/* DESCRIPTION */}
                <div className="flex flex-col gap-1.5 flex-1">
                    <Label className="text-xs text-gray-500">Açıklama</Label>
                    <Input
                        placeholder="Fatura No, Detay vb..."
                        className="h-10"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                </div>

                {/* DUE DATE (Only for Debt) */}
                {type === "0" && (
                    <div className="flex flex-col gap-1.5 w-full md:w-[150px]">
                        <Label className="text-xs text-red-500 font-medium">Vade Tarihi</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-10 border-red-100 hover:bg-red-50 hover:text-red-700",
                                        !dueDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, "d MMM yyyy", { locale: tr }) : "Vade Yok"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                {/* SUBMIT */}
                <Button type="submit" disabled={loading} className="h-10 px-6 bg-slate-900 hover:bg-slate-800 shrink-0">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
                </Button>
            </form>
        </div>
    )
}
