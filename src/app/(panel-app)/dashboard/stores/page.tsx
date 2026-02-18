import { prisma } from "@/lib/db"
import { CreateStoreDialog } from "@/components/stores/create-store-dialog"
import { StoreCard } from "@/components/stores/store-card"
import { DeleteStoreDialog } from "@/components/stores/delete-store-dialog"
import { Store as StoreIcon } from "lucide-react"

export default async function StoresPage() {
    const stores = await prisma.store.findMany({
        include: {
            _count: {
                select: { users: true, sales: true }
            },
            manager: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    permissions: true // To extract phone number from JSON
                }
            }
        }
    })

    // Parse phone from permissions JSON for UI
    const formattedStores = stores.map(store => {
        let phone = null
        try {
            if (store.manager?.permissions) {
                const perms = JSON.parse(store.manager.permissions)
                phone = perms.phone || null
            }
        } catch (e) { }

        return {
            ...store,
            manager: store.manager ? {
                ...store.manager,
                phone: phone
            } : null
        }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mağazalar</h2>
                    <p className="text-muted-foreground">Şubelerinizi ve personellerinizi yönetin.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DeleteStoreDialog stores={stores.map(s => ({ id: s.id, name: s.name }))} />
                    <CreateStoreDialog />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {formattedStores.map((store) => (
                    <StoreCard key={store.id} store={store} />
                ))}

                {stores.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <StoreIcon className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">Henüz Mağaza Yok</h3>
                        <p className="text-muted-foreground mb-4 text-center max-w-sm">
                            Sistemi kullanmaya başlamak için ilk mağazanızı oluşturun.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
