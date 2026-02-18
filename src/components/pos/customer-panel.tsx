"use client"

import * as React from "react"
import { User, Phone, UserPlus, Search, X, LogOut, Gift, Copy, CheckCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { getCustomerByPhone } from "@/actions/pos/pos-actions"
import { logout } from "@/actions/settings/auth"
import { toast } from "sonner"
import { CreateCustomerDialog } from "./create-customer-dialog"

// Staff type
type Staff = {
    id: string;
    username: string;
    name: string | null;
}

interface CustomerPanelProps {
    staffList: Staff[];
    // Staff props removed 

    selectedCustomer: any | null; // Typed loosely for now, refine later
    onCustomerSelect: (customer: any) => void;
    storeName: string;
    isExchangeMode: boolean;
    onExchangeModeChange: (val: boolean) => void;
}

// GiftCardWidget Removed

export function CustomerPanel({
    // Staff props removed
    selectedCustomer,
    onCustomerSelect,
    storeName,
    isExchangeMode,
    onExchangeModeChange
}: CustomerPanelProps) {
    const [phone, setPhone] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [showCreateDialog, setShowCreateDialog] = React.useState(false)

    const handleCustomerSearch = async () => {
        if (phone.length < 3) return
        setLoading(true)
        try {
            const customer = await getCustomerByPhone(phone)
            if (customer) {
                onCustomerSelect(customer)
                toast.success(`Müşteri Bulundu: ${customer.name}`)
                setPhone("")
            } else {
                toast.info("Müşteri bulunamadı. Yeni kayıt açabilirsiniz.")
                // Optional: Auto open dialog if not found?
                // setShowCreateDialog(true)
            }
        } catch (e) {
            toast.error("Arama hatası")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-4 p-4 bg-white dark:bg-gray-900 border-b items-center">
            {/* Store Name Display - Integrated here for now or can be moved */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-indigo-700 dark:text-indigo-300 tracking-tight">{storeName}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => logout()}>
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Customer Search / Info */}
            <div className="flex items-center justify-end gap-3 relative">
                {/* Minimized Gift Card Icon */}
                {/* Minimized Gift Card Icon Removed */}

                {selectedCustomer ? (
                    <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-100 dark:border-green-800 animate-in slide-in-from-right-5 relative">

                        {/* Gift Card Widget Removed */}

                        <div className="h-8 w-8 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                            <User className="h-4 w-4 text-green-700 dark:text-green-300" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-green-900 dark:text-green-100">{selectedCustomer.name}</span>
                            <span className="text-xs text-green-600 dark:text-green-400">{selectedCustomer.phone}</span>
                            {selectedCustomer.type === "CORPORATE" && <span className="text-[10px] uppercase bg-blue-100 text-blue-700 px-1 rounded w-fit mt-0.5">Kurumsal</span>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-green-700" onClick={() => onCustomerSelect(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 w-full max-w-sm">
                        <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Müşteri Tel (5XX...)"
                                className="pl-9 h-10"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCustomerSearch()}
                            />
                        </div>
                        <Button variant="secondary" size="icon" onClick={handleCustomerSearch} disabled={loading}>
                            <Search className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setShowCreateDialog(true)} disabled={loading}>
                            <UserPlus className="h-4 w-4" />
                        </Button>

                        {/* Exchange Mode Toggle via Props */}
                        <div className="flex items-center gap-2 ml-2 border-l pl-3">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="exchange-mode-panel"
                                    checked={isExchangeMode}
                                    onCheckedChange={onExchangeModeChange}
                                    className="data-[state=checked]:bg-indigo-600"
                                />
                                <label
                                    htmlFor="exchange-mode-panel"
                                    className="text-xs font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-indigo-700 select-none whitespace-nowrap"
                                >
                                    DEĞİŞİM MODU
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <CreateCustomerDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                initialPhone={phone}
                onSuccess={(customer) => {
                    onCustomerSelect(customer)
                    setPhone("")
                }}
            />
        </div>
    )
}
