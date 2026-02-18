"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { updateProductModel } from "@/actions/inventory/update-model"

interface EditModelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    model: {
        id: string
        name: string
        category: string
        brand?: string | null
        gender?: string | null
        season?: string | null
    }
}

export function EditModelDialog({ open, onOpenChange, model }: EditModelDialogProps) {
    const [loading, setLoading] = React.useState(false)
    const [formData, setFormData] = React.useState({
        name: "",
        category: "",
        brand: "",
        gender: "",
        season: ""
    })

    React.useEffect(() => {
        if (open && model) {
            setFormData({
                name: model.name || "",
                category: model.category || "",
                brand: model.brand || "",
                gender: model.gender || "Unisex",
                season: model.season || ""
            })
        }
    }, [model, open])

    const onSubmit = async () => {
        if (!formData.name) return toast.error("Model adı zorunludur")

        setLoading(true)
        try {
            const res = await updateProductModel({
                id: model.id,
                name: formData.name,
                category: formData.category,
                brand: formData.brand,
                gender: formData.gender,
                season: formData.season
            })

            if (res.success) {
                toast.success(res.message)
                onOpenChange(false)
            } else {
                toast.error(res.message)
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Model Düzenle</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Model Adı</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Kategori</Label>
                            <Input
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Marka</Label>
                            <Input
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Cinsiyet</Label>
                            <Select
                                value={formData.gender}
                                onValueChange={(val) => setFormData({ ...formData, gender: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Erkek">Erkek</SelectItem>
                                    <SelectItem value="Kadın">Kadın</SelectItem>
                                    <SelectItem value="Unisex">Unisex</SelectItem>
                                    <SelectItem value="Çocuk">Çocuk</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Sezon</Label>
                            <Select
                                value={formData.season}
                                onValueChange={(val) => setFormData({ ...formData, season: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2024 Yaz">2024 Yaz</SelectItem>
                                    <SelectItem value="2024 Kış">2024 Kış</SelectItem>
                                    <SelectItem value="2025 Yaz">2025 Yaz</SelectItem>
                                    <SelectItem value="2025 Kış">2025 Kış</SelectItem>
                                    <SelectItem value="NOS">NOS (Sezonsuz)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                    <Button onClick={onSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
