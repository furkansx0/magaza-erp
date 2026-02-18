"use client"

import { useState, useActionState } from "react"
import { useFormStatus } from "react-dom"
import { updateStore } from "@/actions/settings/update-store"
import { Button } from "@/components/ui/button"
import { StoreDeleteButton } from "@/components/stores/store-delete-button"
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
import { Pen, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { useEffect } from "react"

const initialState = {
    success: false,
    message: "",
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Değişiklikleri Kaydet
        </Button>
    )
}

import { AddStaffDialog } from "@/components/stores/add-staff-dialog"
import { RemoveStaffButton } from "@/components/stores/remove-staff-button"
import { RestoreStaffButton } from "@/components/stores/restore-staff-button"
import { EditStaffDialog } from "@/components/stores/edit-staff-dialog"
import { UseUser } from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronsUpDown } from "lucide-react"

interface EditStoreDialogProps {
    store: {
        id: string
        name: string
        location: string | null
        users: {
            id: string
            name: string | null
            username: string
            role: string
            id: string
            name: string | null
            username: string
            role: string
            isArchived?: boolean
        }[]
    }
}

export function EditStoreDialog({ store }: EditStoreDialogProps) {
    const [open, setOpen] = useState(false)
    const [state, formAction] = useActionState(updateStore, initialState)
    const [username, setUsername] = useState("")

    useEffect(() => {
        // Find store manager role user to populate username
        const manager = store.users.find(u => u.role === "STORE_MANAGER") || store.users[0]
        if (open && manager) {
            setUsername(manager.username)
        }
    }, [open, store])

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast.success(state.message)
                setOpen(false)
            } else {
                toast.error(state.message)
            }
        }
    }, [state])

    // Filter cashiers for the staff list
    // @ts-ignore
    const activeCashiers = store.users.filter(u => u.role === "CASHIER" && !u.isArchived)
    // @ts-ignore
    const archivedCashiers = store.users.filter(u => u.role === "CASHIER" && u.isArchived)

    const [isArchivedOpen, setIsArchivedOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                    <Pen className="h-4 w-4" />
                    Mağazayı Yönet
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Mağaza Yönetimi: {store.name}</DialogTitle>
                    <DialogDescription>
                        Mağaza detaylarını ve personel listesini buradan yönetebilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    {/* LEFT COLUMN: Store Info & Manager */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Mağaza Bilgileri</h3>
                            <form action={formAction} className="space-y-4">
                                <input type="hidden" name="storeId" value={store.id} />

                                <div className="space-y-2">
                                    <Label htmlFor="name">Mağaza Adı</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={store.name}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="location">Konum</Label>
                                    <Input
                                        id="location"
                                        name="location"
                                        defaultValue={store.location || ""}
                                        placeholder="Örn: İstanbul, Kadıköy"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="username">Yönetici Kullanıcı Adı</Label>
                                    <Input
                                        id="username"
                                        name="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="E-posta veya kullanıcı adı"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Yeni Şifre (İsteğe Bağlı)</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="Değiştirmek istemiyorsanız boş bırakın"
                                    />
                                </div>

                                <div className="pt-2">
                                    <SubmitButton />
                                </div>
                            </form>
                        </div>


                    </div>

                    {/* RIGHT COLUMN: Staff Management */}
                    <div className="space-y-6 border-l pl-0 md:pl-8 border-gray-100">
                        <div className="flex items-center justify-between border-b pb-2 mb-4">
                            <h3 className="text-lg font-semibold">Personel Listesi</h3>
                            <AddStaffDialog storeId={store.id} />
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {activeCashiers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                                    <p>Henüz personel eklenmemiş.</p>
                                    <p className="text-sm">"Personel Ekle" butonunu kullanarak ekleyebilirsiniz.</p>
                                </div>
                            ) : (
                                activeCashiers.map((staff) => (
                                    <div key={staff.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                                {(staff.name || "?").charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{staff.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{staff.username}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <EditStaffDialog staffId={staff.id} currentName={staff.name || ""} />
                                            <RemoveStaffButton staffId={staff.id} staffName={staff.name || ""} />
                                        </div>
                                    </div>
                                ))
                            )}

                            {archivedCashiers.length > 0 && (
                                <Collapsible
                                    open={isArchivedOpen}
                                    onOpenChange={setIsArchivedOpen}
                                    className="border rounded-lg mt-4 bg-gray-50/50"
                                >
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="flex w-full justify-between p-4 font-medium text-muted-foreground hover:text-foreground">
                                            <span>Arşivlenmiş Personeller ({archivedCashiers.length})</span>
                                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isArchivedOpen ? "rotate-180" : ""}`} />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="p-4 pt-0 space-y-2">
                                        {archivedCashiers.map((staff) => (
                                            <div key={staff.id} className="flex items-center justify-between p-3 bg-gray-100/50 border rounded-lg opacity-75 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold shrink-0">
                                                        {(staff.name || "?").charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm text-gray-600">{staff.name}</p>
                                                        <p className="text-xs text-gray-400 font-mono">{staff.username}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <RestoreStaffButton staffId={staff.id} staffName={staff.name || ""} />
                                                </div>
                                            </div>
                                        ))}
                                    </CollapsibleContent>
                                </Collapsible>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
