"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { removeStoreStaff } from "@/actions/settings/store-actions"
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

export function RemoveStaffButton({ staffId, staffName }: { staffId: string, staffName: string }) {

    const handleDelete = async () => {
        const result = await removeStoreStaff(staffId)
        if (result.success) {
            toast.success("Personel silindi")
        } else {
            toast.error(result.error)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Personeli arşivlemek istediğine emin misin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <strong>{staffName}</strong> arşivlenecektir. Bu personel artık POS ekranında görünmeyecek ancak işlem geçmişi korunacaktır. İstediğiniz zaman geri yükleyebilirsiniz.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
