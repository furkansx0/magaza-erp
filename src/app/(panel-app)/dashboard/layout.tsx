import { Sidebar, MobileSidebar } from "@/components/dashboard/Sidebar";
import { UserNav } from "@/components/dashboard/UserNav"; // Will create this next
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettingByKey } from "@/actions/settings/settings-actions";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession();
    let storeName = "Yönetim Paneli";

    if (session?.storeId) {
        const store = await db.store.findUnique({
            where: { id: session.storeId },
            select: { name: true }
        });
        if (store) storeName = store.name;
    }

    const modules = await getSettingByKey("modules") || {};
    const labels = await getSettingByKey("menu_labels") || {};

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            {session?.role !== "STORE_MANAGER" && (
                <aside className="hidden w-64 border-r bg-gray-100/40 md:block dark:bg-gray-800/40">
                    <Sidebar
                        userRole={session?.role as string}
                        userPermissions={session?.permissions as string}
                        storeId={session?.storeId || undefined}
                        modules={modules as any}
                        labels={labels as any}
                    />
                </aside>
            )}

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
                {/* Header */}
                <header className="flex h-14 items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
                    {session?.role !== "STORE_MANAGER" && (
                        <MobileSidebar
                            userRole={session?.role as string}
                            userPermissions={session?.permissions as string}
                            storeId={session?.storeId || undefined}
                            modules={modules as any}
                            labels={labels as any}
                        />
                    )}
                    <div className="w-full flex-1">
                        {/* Search bar could go here */}
                    </div>
                    <div className="flex items-center gap-4">
                        {/* <UserNav /> - Removed as per request */}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6">
                    {children}
                </main>
                <Toaster />
            </div>
        </div>
    )
}
