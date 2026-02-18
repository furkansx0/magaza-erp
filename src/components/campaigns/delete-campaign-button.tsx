"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { deleteCampaign } from "@/actions/crm/campaign-actions"
import { toast } from "sonner"
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

export function DeleteCampaignButton({ campaignId }: { campaignId: string }) {
    const [loading, setLoading] = React.useState(false)

    const handleDelete = async () => {
        setLoading(true)
        try {
            const res = await deleteCampaign(campaignId)
            if (res.success) {
                toast.success("Kampanya Silindi", {
                    description: res.deletedCount && res.deletedCount > 0
                        ? `${res.deletedCount} kişiden hediye çeki geri alındı.`
                        : "Kampanya ve verileri temizlendi."
                })
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Kampanyayı silmek istiyor musunuz?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bu işlem geri alınamaz. Kampanya silindiğinde, bu kampanya tarafından oluşturulmuş
                        <b>tüm hediye çekleri de müşterilerden silinecektir.</b>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Evet, Sil"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
