"use client"

import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"
import { restoreStoreStaff } from "@/actions/settings/store-actions"
import { toast } from "sonner"

export function RestoreStaffButton({ staffId, staffName }: { staffId: string, staffName: string }) {

    const handleRestore = async () => {
        const result = await restoreStoreStaff(staffId)
        if (result.success) {
            toast.success("Personel geri yüklendi")
        } else {
            toast.error(result.error)
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleRestore}
            className="h-8 w-8 text-muted-foreground hover:text-green-600"
            title="Geri Yükle"
        >
            <RefreshCcw className="h-4 w-4" />
        </Button>
    )
}
