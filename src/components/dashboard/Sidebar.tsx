"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Store,
    BarChart3,
    Menu,
    LogOut,
    IdCard,
    Gift,
    FileText,
    Settings,
    TestTube,
    Truck,
    Coins
} from "lucide-react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    userRole?: string
    userPermissions?: string
    modules?: Record<string, boolean>
    labels?: Record<string, string>
}

export function Sidebar({ className, userRole, userPermissions, storeId, modules = {}, labels = {} }: SidebarProps & { storeId?: string }) {
    const pathname = usePathname()

    // Parse permissions if it's a JSON string
    let allowedMenus: string[] = []

    // Store Manager ID (if applicable)
    // We don't have direct access to storeId from props easily unless we parse it or pass it.
    // Sidebar receives userRole and userPermissions.
    // userPermissions for Manager has { phone: ..., storeId? - wait, storeId is on the user object, not permission }
    // IMPORTANT: Sidebar doesn't receive the full session or storeId.
    // Layout passes userRole={session?.role} userPermissions={session?.permissions}
    // I need to update Layout to pass storeId as well.

    if (userRole === "ADMIN") {
        allowedMenus = ["dashboard", "pos", "products", "customers", "users", "stores", "reports", "campaigns", "finance"]
    } else if (userRole === "STORE_MANAGER") {
        // Manager sees their dashboard (which is under stores/id) and POS.
        // We will customize the menu list below.
        allowedMenus = ["pos", "my_store"]
    } else if (userPermissions) {
        try {
            allowedMenus = JSON.parse(userPermissions)
        } catch (e) { }
    }

    const routes = [
        {
            label: labels.dashboard || "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
            active: pathname === "/dashboard",
            id: "dashboard",
            requiredModule: null // Always visible
        },
        {
            label: labels.pos || "Satış Ekranı (POS)",
            icon: ShoppingCart,
            href: "/dashboard/pos",
            active: pathname === "/dashboard/pos",
            id: "pos",
            requiredModule: "pos"
        },
        {
            label: labels.products || "Ürünler & Stok",
            icon: Package,
            href: "/dashboard/products",
            active: pathname.includes("/dashboard/products"),
            id: "products",
            requiredModule: "inventory"
        },
        {
            label: labels.customers || "Müşteriler",
            icon: Users,
            href: "/dashboard/customers",
            active: pathname.includes("/dashboard/customers"),
            id: "customers",
            requiredModule: "crm"
        },
        {
            label: labels.users || "Yetkilendirme",
            icon: IdCard,
            href: "/dashboard/users",
            active: pathname.includes("/dashboard/users"),
            id: "users",
            requiredModule: null
        },
        {
            label: labels.campaigns || "Kampanyalar (Otomasyon)",
            icon: Gift,
            href: "/dashboard/campaigns",
            active: pathname.includes("/dashboard/campaigns"),
            id: "campaigns",
            requiredModule: "crm"
        },
        {
            label: labels.stores || "Mağazalar",
            icon: Store,
            href: "/dashboard/stores",
            active: pathname.includes("/dashboard/stores"),
            id: "stores",
            requiredModule: null // Core feature
        },
        {
            label: "Stok Transferleri",
            icon: Truck,
            href: "/dashboard/transfers",
            active: pathname.includes("/dashboard/transfers"),
            id: "stores",
            requiredModule: "inventory"
        },
        {
            label: "Genel Raporlar",
            icon: BarChart3,
            href: "/dashboard/reports",
            active: pathname === "/dashboard/reports",
            id: "reports",
            requiredModule: null
        },
        {
            label: "Finans & Muhasebe",
            icon: Coins,
            href: "/dashboard/finance",
            active: pathname.includes("/dashboard/finance"),
            id: "finance",
            requiredModule: "finance"
        },
        {
            label: "Mağazam",
            icon: Store,
            href: `/dashboard/stores/${storeId}`,
            active: pathname === `/dashboard/stores/${storeId}`,
            id: "my_store",
            requiredModule: null
        },
    ].filter(route => {
        // 1. Role/Permission Check
        if (!allowedMenus.includes(route.id)) return false;

        // 2. Module Toggle Check
        if (route.requiredModule && modules[route.requiredModule] === false) return false;

        return true;
    })

    return (
        <div className={cn("pb-12 h-full flex flex-col", className)}>
            <div className="space-y-4 py-4 flex-1">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Retail ERP
                    </h2>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <Button
                                key={route.href}
                                variant={route.active ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                asChild
                            >
                                <Link href={route.href}>
                                    <route.icon className="mr-2 h-4 w-4" />
                                    {route.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Settings Button at Bottom */}
            <div className="px-3 py-2 border-t space-y-1">
                <Button variant="ghost" className="w-full justify-start select-none" asChild>
                    <Link href="/dashboard/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Ayarlar
                    </Link>
                </Button>
            </div>
        </div>

    )
}

interface MobileSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    userRole?: string
    userPermissions?: string
    modules?: Record<string, boolean>
    labels?: Record<string, string>
}

export function MobileSidebar({ className, userRole, userPermissions, storeId, modules, labels }: MobileSidebarProps & { storeId?: string }) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
                <Sidebar className="w-full pt-10" userRole={userRole} userPermissions={userPermissions} storeId={storeId} modules={modules} labels={labels} />
            </SheetContent>
        </Sheet>
    )
}
