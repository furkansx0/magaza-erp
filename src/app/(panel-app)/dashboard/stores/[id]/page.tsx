import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"
import { EditStoreDialog } from "@/components/stores/edit-store-dialog"
import { StoreReportingView } from "@/components/stores/store-reporting-view"

interface PageProps {
    params: {
        id: string
    }
}

export default async function StoreDetailPage({ params }: PageProps) {
    const { id } = await params;

    const store = await prisma.store.findUnique({
        where: { id },
        include: { users: true }
    })

    if (!store) return notFound();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-bold tracking-tight">{store.name}</h2>
                    <p className="text-muted-foreground">{store.location} - Personel ve Ciro Yönetimi</p>
                </div>
                <div className="flex items-center gap-2">
                    <form action={async () => {
                        "use server"
                        await import("@/app/actions/auth").then(m => m.logout())
                    }}>
                        <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            Çıkış Yap
                        </Button>
                    </form>
                    <EditStoreDialog store={{
                        ...store,
                        location: store.location || ""
                    }} />
                </div>
            </div>

            {/* Reporting View (Tabs & Filters) */}
            <StoreReportingView storeId={id} />
        </div>
    )
}

