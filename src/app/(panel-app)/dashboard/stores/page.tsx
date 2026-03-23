import { db } from "@/lib/db"
import { CreateStoreDialog } from "@/components/stores/create-store-dialog"
import { DeleteStoreDialog } from "@/components/stores/delete-store-dialog"
import { StoreListClient } from "@/components/stores/store-list-client"

export default async function StoresPage() {
    const stores = await db.store.findMany({
        include: {
            _count: {
                select: { users: true, sales: true }
            },
            manager: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    permissions: true
                }
            }
        }
    })

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

            <StoreListClient initialData={formattedStores} />
        </div>
    )
}
