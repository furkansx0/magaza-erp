"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowRight, Clock, Truck, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface PendingTransfersDialogProps {
    transfers: any[] // StockTransfer with relations
}

export function PendingTransfersDialog({ transfers }: PendingTransfersDialogProps) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    const handleCancel = async (e: React.MouseEvent, transferId: string) => {
        e.stopPropagation();
        if (!confirm("Bu transferi iptal etmek istediğinize emin misiniz?")) return;

        try {
            // Dynamic import to avoid server action issues if any, though direct import is usually fine in client components if action is "use server"
            const { cancelTransfer } = await import("@/actions/inventory/transfer-recommendation-actions");
            const res = await cancelTransfer(transferId);

            if (res.success) {
                toast.success(res.message);
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("İşlem sırasında bir hata oluştu.");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="relative">
                    <Clock className="mr-2 h-4 w-4" />
                    Bekleyen İşlemler
                    {transfers.length > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700 hover:bg-orange-200">
                            {transfers.length}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Bekleyen Transfer İşlemleri</DialogTitle>
                    <DialogDescription>
                        Hazırlanması veya kabul edilmesi gereken transferler.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {transfers.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            Bekleyen işlem bulunmuyor.
                        </div>
                    )}
                    {transfers.map((transfer) => (
                        <div key={transfer.id} className="relative group">
                            <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow mb-4 border-l-4 border-l-orange-400"
                                onClick={() => { setOpen(false); router.push(`/dashboard/transfers/${transfer.id}`); }}
                            >
                                <CardHeader className="p-4 pb-2 bg-gray-50/50 flex flex-row items-center justify-between space-y-0">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-orange-600" />
                                            {transfer.transferNo}
                                        </CardTitle>
                                        <span className="text-xs text-muted-foreground mt-1">
                                            {format(new Date(transfer.createdAt), "d MMMM yyyy HH:mm", { locale: tr })}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{transfer.sourceStore.name}</span>
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                            <span className="font-semibold">{transfer.targetStore.name}</span>
                                        </div>
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                            {transfer.status === 'PENDING' ? 'Hazırlanıyor' : transfer.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span>İşlem yapmak için tıklayın.</span>
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium text-gray-700">{transfer.items?.length || 0}</span> Ürün
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Cancel Button */}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-3 right-3 h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                onClick={(e) => handleCancel(e, transfer.id)}
                                title="Transferi İptal Et"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
