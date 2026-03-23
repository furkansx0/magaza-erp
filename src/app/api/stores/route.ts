import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
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
        });

        // Parse phone from permissions JSON for UI
        const formattedStores = stores.map(store => {
            let phone = null;
            try {
                if (store.manager?.permissions) {
                    const perms = JSON.parse(store.manager.permissions);
                    phone = perms.phone || null;
                }
            } catch (e) { }

            return {
                ...store,
                manager: store.manager ? {
                    ...store.manager,
                    phone: phone
                } : null
            };
        });

        return NextResponse.json({ success: true, data: formattedStores });
    } catch (error) {
        console.error("API Stores Error:", error);
        return NextResponse.json({ success: false, error: "Mağazalar getirilemedi" }, { status: 500 });
    }
}
