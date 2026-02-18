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
import { Checkbox } from "@/components/ui/checkbox"
import { UserPlus } from "lucide-react"
import { createSystemUser } from "@/actions/settings/user-actions"
import { toast } from "sonner"

const PERMISSIONS = [
    { id: "dashboard", label: "Dashboard (Ana Sayfa)" },
    { id: "pos", label: "POS Erişimi" },
    { id: "products", label: "Ürünler & Stok" },
    { id: "customers", label: "Müşteriler" },
    { id: "stores", label: "Mağazalar" },
    { id: "reports", label: "Raporlar" },
]

export function CreateSystemUserDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        password: "",
        permissions: [] as string[]
    })

    const handlePermissionChange = (permId: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: checked
                ? [...prev.permissions, permId]
                : prev.permissions.filter(p => p !== permId)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await createSystemUser(formData)

        if (result.success) {
            toast.success("Yetkili kullanıcı oluşturuldu")
            setOpen(false)
            setFormData({ name: "", username: "", password: "", permissions: [] })
        } else {
            toast.error(result.error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Yeni Yetkili Ekle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Yeni Yetkili Tanımla</DialogTitle>
                        <DialogDescription>
                            Depo, CRM veya Yönetici yardımcısı tanımlayıp yetkilerini seçin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sys-username" className="text-right">Kullanıcı Adı</Label>
                            <Input
                                id="sys-username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="col-span-3"
                                placeholder="depo_muduru"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sys-pass" className="text-right">Şifre</Label>
                            <Input
                                id="sys-pass"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sys-name" className="text-right">Ad Soyad</Label>
                            <Input
                                id="sys-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                                placeholder="Ali Veli"
                            />
                        </div>

                        <div className="space-y-3 mt-2 border-t pt-4">
                            <Label className="text-base">Erişim Yetkileri</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {PERMISSIONS.map(perm => (
                                    <div key={perm.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`perm-${perm.id}`}
                                            checked={formData.permissions.includes(perm.id)}
                                            onCheckedChange={(c) => handlePermissionChange(perm.id, c as boolean)}
                                        />
                                        <label
                                            htmlFor={`perm-${perm.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {perm.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Oluşturuluyor..." : "Oluştur"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
