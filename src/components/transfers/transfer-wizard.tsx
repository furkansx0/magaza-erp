"use client"

import type { ValidatedProduct } from '@/types/actions';
﻿import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowRight, Check, ScanBarcode, Store, Trash2, Box, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { validateProductByBarcode } from '@/actions/inventory/transfer-wizard-actions'
import { createTransferRequest } from '@/actions/inventory/transfer-actions'

interface Store {
    id: string
    name: string
}

export function TransferWizard({ stores, currentStaffId }: { stores: Store[], currentStaffId?: string }) {
    const router = useRouter()
    const [step, setStep] = React.useState(1)
    const [loading, setLoading] = React.useState(false)

    // Data
    const [sourceStoreId, setSourceStoreId] = React.useState("")
    const [targetStoreId, setTargetStoreId] = React.useState("")
    const [items, setItems] = React.useState<ValidatedProduct[]>([])

    // Scanner State
    const [barcodeInput, setBarcodeInput] = React.useState("")
    const barcodeInputRef = React.useRef<HTMLInputElement>(null)

    // Current User (simulated for now if needed, but action handles session)
    // We can pass a dummy ID if needed via props later.

    const handleNext = () => {
        if (step === 1) {
            if (!sourceStoreId || !targetStoreId) {
                toast.error("Lütfen her iki mağazayı da seçiniz.")
                return
            }
            if (sourceStoreId === targetStoreId) {
                toast.error("Kaynak ve hedef mağaza aynı olamaz.")
                return
            }
            setStep(2)
            // Focus input after render
            setTimeout(() => barcodeInputRef.current?.focus(), 100)
        } else if (step === 2) {
            if (items.length === 0) {
                toast.error("Lütfen en az bir ürün ekleyiniz.")
                return
            }
            setStep(3)
        }
    }

    const handleBack = () => {
        setStep(p => Math.max(1, p - 1))
    }

    const onScan = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!barcodeInput.trim()) return

        const code = barcodeInput.trim()
        setBarcodeInput("") // Clear immediately for next scan

        // Check if already in list? User says "1 tane var", so maybe warn or allow duplicate line?
        // Let's allow duplicate lines to represent multiple physical items, OR increment qty.
        // Since schema is Quantity based, incrementing logic is safer for display.
        // But for visual confirmation "scanning 3 shirts", seeing 3 rows is sometimes better for "Serial" feel.
        // However, standard is increment. Let's increment.

        // Actually, user said "adet input kısmı girmene gerek yok... zaten 1 tane var".
        // This implies: Each scan = 1 item.
        // I will add as separate line items initially for visual verification, OR group them.
        // Grouping is better for "Confirm Grid".

        try {
            const res = await validateProductByBarcode(code, sourceStoreId)

            if (!res.success || !res.product) {
                toast.error(res.error || "Ürün bulunamadı")
                return
            }

            // Check if we have enough stock locally in the list
            const currentQtyInList = items.filter(i => i.variantId === res.product!.variantId).length
            if (currentQtyInList + 1 > res.product.stock) {
                toast.error(`Stok yetersiz! (Mevcut: ${res.product.stock})`)
                return
            }

            toast.success("Ürün eklendi")
            setItems(prev => [...prev, res.product!])

        } catch (error) {
            toast.error("Tarama hatası")
        }
    }

    const handleFinish = async () => {
        setLoading(true)

        // Group items for API
        // Map<VariantId, Quantity>
        const grouped = items.reduce((acc, item) => {
            acc[item.variantId] = (acc[item.variantId] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const payloadItems = Object.entries(grouped).map(([variantId, quantity]) => ({
            variantId,
            quantity
        }))

        const res = await createTransferRequest({
            sourceStoreId,
            targetStoreId,
            items: payloadItems,
            note: "Sihirbaz ile Transfer",
            staffId: currentStaffId
        })

        setLoading(false)

        if (res.success) {
            toast.success("Transfer tamamlandı! Stoklar güncellendi.")
            // router.push("/dashboard/transfers") // Or reload
            // User might want to stay to transfer more? Let's go to list properly.
            router.refresh()
            router.push("/dashboard/products") // Redirect to products or dashboard as verified
        } else {
            toast.error(res.error)
        }
    }

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    // Group items for Step 3 Display
    const groupedDisplay = React.useMemo(() => {
        const map = new Map<string, ValidatedProduct & { count: number }>()
        items.forEach(item => {
            if (map.has(item.variantId)) {
                map.get(item.variantId)!.count++
            } else {
                map.set(item.variantId, { ...item, count: 1 })
            }
        })
        return Array.from(map.values())
    }, [items])

    return (
        <div className="max-w-4xl mx-auto py-6">

            {/* Steps Indicator */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded"></div>

                {[1, 2, 3].map(s => (
                    <div key={s} className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all border-4",
                        step >= s ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-gray-300 text-gray-400"
                    )}>
                        {step > s ? <Check className="w-5 h-5" /> : s}
                    </div>
                ))}
            </div>

            <Card className="shadow-lg border-t-4 border-t-orange-500">
                <CardHeader>
                    <CardTitle>
                        {step === 1 && "Adım 1: Mağaza Seçimi"}
                        {step === 2 && "Adım 2: Ürün Barkod Okutma"}
                        {step === 3 && "Adım 3: Kontrol ve Onay"}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 && "Transferin yapılacağı kaynak ve hedef mağazayı belirleyin."}
                        {step === 2 && "Ürün barkodlarını okutarak listeye ekleyin. Stok kontrolleri otomatik yapılır."}
                        {step === 3 && "Transfer edilecek ürünleri kontrol edip işlemi tamamlayın."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="min-h-[400px] flex flex-col">

                    {/* STEP 1: Stores */}
                    {step === 1 && (
                        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3 p-6 bg-red-50 rounded-lg border border-red-100">
                                    <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                                        <Store className="w-5 h-5" />
                                        Çıkış Mağazası (Kaynak)
                                    </div>
                                    <Select value={sourceStoreId} onValueChange={setSourceStoreId}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Seçiniz..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stores.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-red-600/70">Ürünler bu mağazanın stoğundan düşülecek.</p>
                                </div>

                                <div className="space-y-3 p-6 bg-green-50 rounded-lg border border-green-100">
                                    <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                                        <Store className="w-5 h-5" />
                                        Varış Mağazası (Hedef)
                                    </div>
                                    <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Seçiniz..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stores.filter(s => s.id !== sourceStoreId).map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-green-600/70">Ürünler bu mağazanın stoğuna eklenecek.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Scanning */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 h-full">
                            {/* Input Area */}
                            <form onSubmit={onScan} className="flex gap-2 p-4 bg-gray-50 rounded-lg border">
                                <SearchIcon className="text-gray-400 mt-2.5" />
                                <Input
                                    ref={barcodeInputRef}
                                    autoFocus
                                    placeholder="Barkod okutun veya yazıp Enter'a basın..."
                                    className="text-lg h-12"
                                    value={barcodeInput}
                                    onChange={e => setBarcodeInput(e.target.value)}
                                />
                                <Button type="submit" size="lg" className="bg-blue-600">Ekle</Button>
                            </form>

                            {/* List Area */}
                            <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
                                <div className="bg-gray-100 p-2 font-semibold text-sm grid grid-cols-12 gap-2 text-gray-600">
                                    <div className="col-span-1">#</div>
                                    <div className="col-span-3">Model</div>
                                    <div className="col-span-4">Varyant</div>
                                    <div className="col-span-3">Barkod</div>
                                    <div className="col-span-1"></div>
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-2 max-h-[400px]">
                                    {items.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                            <ScanBarcode className="w-12 h-12 opacity-50" />
                                            <p>Henüz ürün okutulmadı.</p>
                                        </div>
                                    ) : (
                                        items.map((item, idx) => (
                                            <div key={idx} className="bg-white p-2 rounded border shadow-sm grid grid-cols-12 gap-2 items-center text-sm animate-in slide-in-from-top-2">
                                                <div className="col-span-1 font-mono text-gray-400">{idx + 1}</div>
                                                <div className="col-span-3 font-medium truncate" title={item.modelName}>{item.modelName}</div>
                                                <div className="col-span-4 text-gray-600">{item.color} / {item.size}</div>
                                                <div className="col-span-3 font-mono text-xs bg-gray-100 px-1 rounded w-fit">{item.barcode}</div>
                                                <div className="col-span-1 text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-6 w-6 text-red-500 hover:text-red-700">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )).reverse() // Show newest first
                                    )}
                                </div>
                            </div>

                            <div className="text-right text-sm text-gray-500">
                                Toplam: <span className="font-bold text-black text-lg">{items.length}</span> ürün
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Confirm */}
                    {step === 3 && (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex gap-4 text-sm text-orange-800">
                                <Box className="shrink-0" />
                                <div>
                                    <p className="font-bold">Özet</p>
                                    <p>
                                        Aşağıdaki ürünler <strong>{stores.find(s => s.id === sourceStoreId)?.name}</strong> deposundan
                                        çıkıp <strong>{stores.find(s => s.id === targetStoreId)?.name}</strong> deposuna aktarılacak.
                                        İşlem geri alınamaz.
                                    </p>
                                </div>
                            </div>

                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                                        <tr>
                                            <th className="p-3">Ürün</th>
                                            <th className="p-3">Renk/Beden</th>
                                            <th className="p-3 text-right">Adet</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {groupedDisplay.map((item) => (
                                            <tr key={item.variantId} className="bg-white">
                                                <td className="p-3 font-medium">{item.modelName}</td>
                                                <td className="p-3 text-gray-600">{item.color} / {item.size}</td>
                                                <td className="p-3 text-right font-bold">{item.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold border-t">
                                        <tr>
                                            <td className="p-3" colSpan={2}>Genel Toplam</td>
                                            <td className="p-3 text-right">{items.length}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </CardContent>

                {/* Actions Footer */}
                <div className="p-6 border-t bg-gray-50 flex justify-between rounded-b-lg">
                    {step > 1 ? (
                        <Button variant="outline" onClick={handleBack} disabled={loading}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                        </Button>
                    ) : (
                        <div></div> // Spacer
                    )}

                    {step < 3 ? (
                        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                            İleri <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleFinish} disabled={loading} className="bg-green-600 hover:bg-green-700 min-w-[150px]">
                            {loading ? "İşleniyor..." : "Transferi Tamamla"}
                            {!loading && <Check className="w-4 h-4 ml-2" />}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    )
}

function SearchIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    )
}
