"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateStoreManager } from "@/actions/settings/store-actions"
import { ShieldCheck, User, Key, Phone } from "lucide-react"

interface StoreManagerDialogProps {
    storeId: string
    currentManager: {
        id: string
        name: string | null
        username: string
        phone: string | null
    } | null
    children: React.ReactNode
}

export function StoreManagerDialog({ storeId, currentManager, children }: StoreManagerDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form State
    const [name, setName] = useState(currentManager?.name || "")
    const [phone, setPhone] = useState(currentManager?.phone || "")
    const [username, setUsername] = useState(currentManager?.username || "")
    const [password, setPassword] = useState("") // Empty by default, only send if changing

    const handleSubmit = async () => {
        if (!username) {
            toast.error("Kullanıcı adı zorunludur.")
            return
        }

        setLoading(true)
        const res = await updateStoreManager({
            storeId,
            name,
            phone,
            username,
            password: password || undefined // Don't send empty string if not changing
        })
        setLoading(false)

        if (res.success) {
            toast.success("Mağaza müdürü güncellendi.")
            setOpen(false)
        } else {
            toast.error(res.message || "Güncelleme başarısız.")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                        Mağaza Müdürü Yönetimi
                    </DialogTitle>
                    <DialogDescription>
                        Bu mağazanın yetkili müdür bilgilerini ve giriş şifresini düzenleyin.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" /> Ad Soyad
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Müdür Adı Soyadı"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" /> Telefon
                        </Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0555..."
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Giriş Bilgileri</span>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="username" className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-gray-400" /> Kullanıcı Adı
                        </Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Giriş için kullanıcı adı"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Şifre</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={currentManager ? "Değiştirmek için yeni şifre girin" : "Şifre belirleyin"}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            {currentManager ? "Boş bırakırsanız mevcut şifre değişmez." : "Yeni müdür için şifre zorunludur."}
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                        {loading ? "Kaydediliyor..." : "Bilgileri Güncelle"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
