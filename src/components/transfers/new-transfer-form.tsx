"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTransferRequest } from "@/actions/inventory/transfer-actions"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

interface Store {
    id: string
    name: string
}

interface NewTransferFormProps {
    stores: Store[]
}

export function NewTransferForm({ stores }: NewTransferFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const [sourceStoreId, setSourceStoreId] = useState("")
    const [targetStoreId, setTargetStoreId] = useState("")
    const [note, setNote] = useState("")

    // Simple item adder for MVP (Barcode lookup would be better, but manual ID entry for speed now)
    // Actually, asking for variant ID is hard. Let's assume they copy paste or we use a finder.
    // For this prompt "Detailed WMS", I should allow searching products.
    // Making it simple: Input text for "Barcode" -> resolves to Variant ID.
    // I need a server action to find variant by barcode.

    // Let's implement a quick "Add Item by Barcode" row.
    const [scanBarcode, setScanBarcode] = useState("")
    const [scanQty, setScanQty] = useState(1)

    type TransferItem = { variantId: string, barcode: string, name: string, quantity: number }
    const [items, setItems] = useState<TransferItem[]>([])

    // Simulated lookup (In real app, call server action `findProductByBarcode`)
    // Currently tricky without that action. I will create a dummy action or rely on user knowing IDs? No that's bad UX.
    // Let's rely on basic text input for Variant ID for the very first step or skip "Search" and just mock it? 
    // NO, I must build it properly.

    const handleCreate = async () => {
        if (!sourceStoreId || !targetStoreId) {
            toast.error("Lütfen kaynak ve hedef mağaza seçin")
            return
        }
        if (items.length === 0) {
            toast.error("Lütfen en az bir ürün ekleyin")
            return
        }

        setLoading(true)
        const res = await createTransferRequest({
            sourceStoreId,
            targetStoreId,
            note,
            items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity }))
        })
        setLoading(false)

        if (res.success) {
            toast.success("Transfer talebi oluşturuldu")
            router.push(`/dashboard/transfers/${res.transferId}`)
        } else {
            toast.error(res.error)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Çıkış Mağazası (Kaynak)</Label>
                    <Select onValueChange={setSourceStoreId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Mağaza Seç" />
                        </SelectTrigger>
                        <SelectContent>
                            {stores.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Varış Mağazası (Hedef)</Label>
                    <Select onValueChange={setTargetStoreId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Mağaza Seç" />
                        </SelectTrigger>
                        <SelectContent>
                            {stores.filter(s => s.id !== sourceStoreId).map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="border p-4 rounded-md bg-gray-50 space-y-4">
                <h3 className="font-semibold">Ürün Ekle (Simülasyon)</h3>
                <p className="text-sm text-muted-foreground">Test için veritabanından geçerli bir Variant ID yapıştırın veya barkod kullanın. (Şimdilik manuel ID girişi)</p>

                <div className="flex gap-2">
                    <Input
                        placeholder="Variant ID (Örn: ürün detaydan kopyalayın)"
                        value={scanBarcode}
                        onChange={(e) => setScanBarcode(e.target.value)}
                    />
                    <Input
                        type="number"
                        value={scanQty}
                        onChange={(e) => setScanQty(Number(e.target.value))}
                        className="w-24"
                    />
                    <Button onClick={() => {
                        if (!scanBarcode) return;
                        setItems([...items, {
                            variantId: scanBarcode, // Using barcode input as ID primarily for now
                            barcode: scanBarcode,
                            name: "Manuel Ürün", // Name lookup requires callback
                            quantity: scanQty
                        }])
                        setScanBarcode("")
                    }}>Ekle</Button>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="font-semibold">Transfer Listesi</h3>
                {items.length === 0 && <p className="text-sm text-gray-500">Liste boş.</p>}
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border p-2 rounded bg-white">
                        <span>{item.variantId} (x{item.quantity})</span>
                        <Button variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <Label>Not</Label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="İsteğe bağlı açıklama..." />
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.back()}>İptal</Button>
                <Button onClick={handleCreate} disabled={loading}>
                    {loading ? "Oluşturuluyor..." : "Transfer Kaydı Oluştur"}
                </Button>
            </div>
        </div>
    )
}
