"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus } from "lucide-react"
import { addStoreStaff } from "@/actions/settings/store-actions"
import { toast } from "sonner"

export function AddStaffDialog({ storeId }: { storeId: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Only sending name, backend generates rest
        const result = await addStoreStaff(storeId, name)

        if (result.success) {
            toast.success("Personel eklendi")
            setOpen(false)
            setName("")
        } else {
            toast.error(result.error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Personel Ekle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Yeni Personel Ekle</DialogTitle>
                        <DialogDescription>
                            Personel takibi için isim giriniz. Sistem otomatik kimlik atayacaktır.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="staff-name" className="text-right">
                                Ad Soyad
                            </Label>
                            <Input
                                id="staff-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="Örn: Ahmet Yılmaz"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Ekleniyor..." : "Ekle"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
