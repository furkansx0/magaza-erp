import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteStore } from "@/actions/settings/store-actions"
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

interface StoreDeleteButtonProps {
    storeId: string
    storeName: string
    className?: string
    variant?: React.ComponentProps<typeof Button>["variant"]
    children?: React.ReactNode
}

export function StoreDeleteButton({ storeId, storeName, className, variant = "ghost", children }: StoreDeleteButtonProps) {

    const handleDelete = async () => {
        const result = await deleteStore(storeId)
        if (result.success) {
            toast.info("Mağaza silindi")
        } else {
            toast.error(result.error)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant={variant} size={children ? "default" : "icon"} className={className || "h-8 w-8 text-muted-foreground hover:text-red-600"}>
                    {children || <Trash2 className="h-4 w-4" />}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Mağazayı silmek istediğine emin misin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <strong>{storeName}</strong> mağazası ve ona bağlı tüm stoklar, satışlar ve personeller silinecektir. Bu işlem geri alınamaz.
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
