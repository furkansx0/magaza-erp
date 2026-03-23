import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const customers = await db.customer.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                sales: {
                    select: {
                        totalAmount: true,
                        createdAt: true
                    }
                }
            }
        });

        // Transform data for the grid (Same logic as in page.tsx)
        const gridData = customers.map(c => {
            const totalSpent = c.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
            let lastPurchaseDate = null;
            if (c.sales.length > 0) {
                lastPurchaseDate = c.sales.reduce((latest, sale) => {
                    return sale.createdAt > latest ? sale.createdAt : latest;
                }, c.sales[0].createdAt);
            }

            return {
                id: c.id,
                name: c.name || "-",
                phone: c.phone || "",
                email: c.email || "",
                city: c.city || "",
                district: c.district || "",
                type: c.type,
                gender: c.gender || "-",
                salesCount: c.sales.length,
                totalSpent: totalSpent,
                lastPurchaseDate: lastPurchaseDate,
                createdAt: c.createdAt
            };
        });

        return NextResponse.json({ success: true, data: gridData });
    } catch (error) {
        console.error("API Customers Error:", error);
        return NextResponse.json({ success: false, error: "Müşteriler getirilemedi" }, { status: 500 });
    }
}
