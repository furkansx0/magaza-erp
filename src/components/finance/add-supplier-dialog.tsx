"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { addSupplier } from "@/actions/finance/finance-actions"
import { toast } from "sonner"

export function AddSupplierDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [address, setAddress] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return toast.error("Firma adı zorunludur.")

        setLoading(true)
        const res = await addSupplier({ name, phone, address })
        setLoading(false)

        if (res.success) {
            toast.success(res.message)
            setOpen(false)
            setName("")
            setPhone("")
            setAddress("")
        } else {
            toast.error(res.message)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Yeni Firma Ekle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Tedarikçi Ekle</DialogTitle>
                    <DialogDescription>
                        Yeni bir tedarikçi veya toptancı kaydı oluşturun.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Firma Adı</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Örn: ABC Tekstil Ltd." autoFocus />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0212..." />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="address">Adres</Label>
                        <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Merter, İstanbul" />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
