import { db } from "@/lib/db"
import { PosClient } from "@/components/pos/pos-client"

import { getSession } from "@/lib/auth"

export default async function PosPage() {
    const session = await getSession();
    const userStoreId = session?.storeId;

    // Fetch active users to select as staff
    // If store user, ONLY show staff from that store.
    // If admin, show all? Or maybe just Admin users? 
    // For now, let's filter by storeId if present.

    let staffList = await db.user.findMany({
        where: {
            ...(userStoreId ? { storeId: userStoreId } : {})
        },
        select: {
            id: true,
            username: true,
            name: true
        }
    })

    // Fetch Store Name
    let storeName = "Tüm Mağazalar (Admin)";
    if (userStoreId) {
        const store = await db.store.findUnique({
            where: { id: userStoreId },
            select: { name: true }
        });
        if (store) storeName = store.name;
    }

    // Fallback if no users exist
    if (staffList.length === 0) {
        staffList = [
            { id: "default-1", username: "kasa", name: "Genel Kasa" }
        ]
    }

    return <PosClient staffList={staffList as any} storeName={storeName} campaigns={[]} />
}
