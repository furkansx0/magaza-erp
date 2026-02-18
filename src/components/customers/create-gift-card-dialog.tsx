"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Gift } from "lucide-react"
import { toast } from "sonner"
import { createGiftCard } from "@/actions/crm/gift-card-actions"

interface CreateGiftCardDialogProps {
    customerId: string
    customerName: string
    onSuccess?: () => void
}

export function CreateGiftCardDialog({ customerId, customerName, onSuccess }: CreateGiftCardDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [type, setType] = React.useState<"FIXED_AMOUNT" | "PERCENTAGE">("FIXED_AMOUNT")
    const [value, setValue] = React.useState("")
    const [validDays, setValidDays] = React.useState("365")

    const handleSubmit = async () => {
        if (!value || Number(value) <= 0) {
            toast.error("Geçerli bir değer giriniz.");
            return;
        }

        setLoading(true)
        try {
            const result = await createGiftCard({
                customerId,
                type: type,
                value: Number(value),
                daysValid: Number(validDays)
            })

            if (result.success) {
                toast.success("Hediye çeki oluşturuldu!");
                setOpen(false)
                setValue("")
                onSuccess?.()
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Gift className="h-4 w-4" />
                    Çek Tanımla
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Hediye Çeki Oluştur</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="p-3 bg-purple-50 text-purple-900 rounded-lg text-sm">
                        Bu çek sadece <strong>{customerName}</strong> müşterisi tarafından kullanılabilir.
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant={type === "FIXED_AMOUNT" ? "default" : "outline"}
                            onClick={() => setType("FIXED_AMOUNT")}
                            className={type === "FIXED_AMOUNT" ? "bg-purple-600" : ""}
                        >
                            Sabit Tutar (TL)
                        </Button>
                        <Button
                            variant={type === "PERCENTAGE" ? "default" : "outline"}
                            onClick={() => setType("PERCENTAGE")}
                            className={type === "PERCENTAGE" ? "bg-purple-600" : ""}
                        >
                            Yüzdelik İndirim (%)
                        </Button>
                    </div>

                    <div className="grid gap-2">
                        <Label>{type === "FIXED_AMOUNT" ? "Tutar (TL)" : "İndirim Oranı (%)"}</Label>
                        <Input
                            type="number"
                            placeholder={type === "FIXED_AMOUNT" ? "0.00" : "10"}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Geçerlilik Süresi</Label>
                        <Select value={validDays} onValueChange={setValidDays}>
                            <SelectTrigger>
                                <SelectValue placeholder="Süre Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="30">1 Ay (30 Gün)</SelectItem>
                                <SelectItem value="90">3 Ay (90 Gün)</SelectItem>
                                <SelectItem value="180">6 Ay (180 Gün)</SelectItem>
                                <SelectItem value="365">1 Yıl (365 Gün)</SelectItem>
                                <SelectItem value="730">2 Yıl</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Oluştur
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
