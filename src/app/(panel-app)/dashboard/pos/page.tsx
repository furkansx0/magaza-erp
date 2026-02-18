import { db } from "@/lib/db"
import { PosClient } from "@/components/pos/pos-client"
import { getSession } from "@/lib/auth"
import { getProductCampaigns } from "@/actions/crm/campaign-product-actions"

export default async function DashboardPosPage() {
    const session = await getSession();

    // Fetch all cashiers for potential selection
    const staffList = await db.user.findMany({
        // @ts-ignore
        where: { role: "CASHIER", isArchived: false },
        select: { id: true, username: true, name: true, storeId: true }
    });

    // Fetch stores for Admin selector
    const stores = await db.store.findMany({
        select: { id: true, name: true }
    });

    // Fetch campaigns
    const campaigns = await getProductCampaigns(session?.storeId || stores[0]?.id);

    return (
        <div className="h-[calc(100vh-8rem)]" >
            <PosClient
                staffList={staffList}
                stores={stores}
                storeName="Yönetim Paneli" // This will be overridden or ignored in Admin view
                currentUserRole={session?.role}
                currentUserStoreId={session?.storeId}
                campaigns={campaigns}
            />
        </div>
    )
}
