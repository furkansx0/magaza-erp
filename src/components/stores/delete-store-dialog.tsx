"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { deleteStore } from "@/actions/settings/store-actions"
import { Trash2, AlertTriangle } from "lucide-react"

interface DeleteStoreDialogProps {
    stores: { id: string, name: string }[]
}

export function DeleteStoreDialog({ stores }: DeleteStoreDialogProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(1) // 1: Select, 2: Confirm 1, 3: Confirm 2
    const [selectedStoreId, setSelectedStoreId] = useState("")
    const [loading, setLoading] = useState(false)

    const handleNext = async () => {
        if (step === 1 && !selectedStoreId) return

        if (step < 3) {
            setStep(prev => prev + 1)
        } else {
            // Final Delete
            setLoading(true)
            const res = await deleteStore(selectedStoreId)
            setLoading(false)

            if (res.success) {
                toast.success("Mağaza başarıyla silindi.")
                setOpen(false)
                setStep(1)
                setSelectedStoreId("")
            } else {
                toast.error("Silme başarısız. (Satış veya stok kaydı olabilir)")
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep(1); }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Mağaza Sil
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Mağaza Silme İşlemi
                    </DialogTitle>
                    <DialogDescription>
                        Bu işlem geri alınamaz. Lütfen dikkatli olun.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === 1 && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium">Silinecek mağazayı seçiniz:</p>
                            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Mağaza Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-100 text-red-800">
                            <h4 className="font-bold">Emin misiniz?</h4>
                            <p className="text-sm">
                                Seçilen mağazaya ait tüm stok, satış ve personel verileri etkilenebilir.
                                Devam etmek istiyor musunuz?
                            </p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 p-4 bg-red-100 rounded-lg border border-red-200 text-red-900">
                            <h4 className="font-black text-lg">SON ONAY</h4>
                            <p className="text-sm font-semibold">
                                Bu işlem gerçekten geri alınamaz. Mağazayı silmek üzeresiniz.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                    <Button
                        variant="destructive"
                        onClick={handleNext}
                        disabled={loading || (step === 1 && !selectedStoreId)}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {step === 3 ? (loading ? "Siliniyor..." : "Evet, Sil") : "Devam Et"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
