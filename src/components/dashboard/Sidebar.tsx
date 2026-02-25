"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ModuleConfig } from "@/lib/registry"
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
    dynamicModules?: ModuleConfig[]
    topWidgetSlot?: React.ReactNode // Eklenti enjeksiyon kancası
}

export function Sidebar({ className, userRole, userPermissions, storeId, modules = {}, labels = {}, dynamicModules = [], topWidgetSlot }: SidebarProps & { storeId?: string }) {
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
        allowedMenus = [
            "dashboard", "pos", "products", "customers", "users", "stores", "reports", "campaigns", "finance",
            ...dynamicModules.map(m => m.id)
        ]
    } else if (userRole === "STORE_MANAGER") {
        // Manager sees their dashboard (which is under stores/id) and POS.
        // We will customize the menu list below.
        allowedMenus = ["pos", "my_store"]
    } else if (userPermissions) {
        try {
            allowedMenus = JSON.parse(userPermissions)
        } catch (e) { }
    }

    // Map string names to Lucide icons
    const IconMap: Record<string, any> = {
        Package: Package,
        Users: Users,
        Coins: Coins,
    };

    // Helper function for local check
    const isModuleEnabled = (moduleId: string): boolean => {
        const mod = dynamicModules.find(m => m.id === moduleId);
        return mod ? mod.isEnabled : false;
    };

    const moduleRoutes = dynamicModules.filter(m => m.isEnabled).map(m => ({
        label: labels[m.id] || m.name,
        icon: IconMap[m.iconName] || Package,
        href: m.route,
        active: pathname.includes(m.route),
        id: m.id,
        requiredModule: m.id
    }));

    const coreRoutes = [
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
            requiredModule: null
        }
    ];

    const supplementaryRoutes = [
        {
            label: labels.campaigns || "Kampanyalar (Otomasyon)",
            icon: Gift,
            href: "/dashboard/campaigns",
            active: pathname.includes("/dashboard/campaigns"),
            id: "campaigns",
            requiredModule: "customers" // Linked to customers domain
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
            id: "transfers",
            requiredModule: "inventory" // Linked to inventory domain
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
            label: labels.users || "Yetkilendirme",
            icon: IdCard,
            href: "/dashboard/users",
            active: pathname.includes("/dashboard/users"),
            id: "users",
            requiredModule: null
        },
        {
            label: "Mağazam",
            icon: Store,
            href: `/dashboard/stores/${storeId}`,
            active: pathname === `/dashboard/stores/${storeId}`,
            id: "my_store",
            requiredModule: null
        }
    ];

    const routes = [
        ...coreRoutes,
        ...moduleRoutes,
        ...supplementaryRoutes
    ].filter(route => {
        // 1. Role/Permission Check
        if (!allowedMenus.includes(route.id)) {
            // Check if it's linking to a dynamic module that wasn't specifically denied by ID but might share permissions. 
            // In a real strict environment, role check overrules.
            // Let's allow modules to bypass hardcoded roles if not matched, or rely on allowedMenus.
            // Since previous allowedMenus were hardcoded "products", "customers", we map dynamic IDs:
            const legacyMap: Record<string, string> = {
                "inventory": "products",
                "transfers": "stores"
            };
            const legacyId = legacyMap[route.id] || route.id;
            if (!allowedMenus.includes(legacyId)) return false;
        }

        // 2. Module Toggle Check via Registry
        if (route.requiredModule && !isModuleEnabled(route.requiredModule)) return false;

        return true;
    });

    return (
        <div className={cn("pb-12 h-full flex flex-col", className)}>
            <div className="space-y-4 py-4 flex-1">
                <div className="px-3 py-2">
                    <h2 className="mb-4 px-4 text-lg font-semibold tracking-tight">
                        Retail ERP
                    </h2>

                    {/* EKLENTİ BÖLGESİ (SLOT KANCASI) */}
                    <div className="px-2 mb-2">
                        {topWidgetSlot}
                    </div>

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
                <Button variant="ghost" className="w-full justify-start select-none text-orange-600 hover:text-orange-700 hover:bg-orange-50" asChild>
                    <Link href="/dashboard/developer">
                        <TestTube className="mr-2 h-4 w-4" />
                        Geliştirici
                    </Link>
                </Button>
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
    dynamicModules?: ModuleConfig[]
    topWidgetSlot?: React.ReactNode
}

export function MobileSidebar({ className, userRole, userPermissions, storeId, modules, labels, dynamicModules, topWidgetSlot }: MobileSidebarProps & { storeId?: string }) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
                <Sidebar className="w-full pt-10" userRole={userRole} userPermissions={userPermissions} storeId={storeId} modules={modules} labels={labels} dynamicModules={dynamicModules} topWidgetSlot={topWidgetSlot} />
            </SheetContent>
        </Sheet>
    )
}
