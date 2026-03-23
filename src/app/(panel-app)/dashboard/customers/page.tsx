import { db } from "@/lib/db"
import { CustomerListClient } from "@/components/customers/customer-list-client"

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
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
    })

    const gridData = customers.map(c => {
        const totalSpent = c.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
        let lastPurchaseDate: Date | null = null
        if (c.sales.length > 0) {
            lastPurchaseDate = c.sales.reduce((latest, sale) => {
                return sale.createdAt > latest ? sale.createdAt : latest
            }, c.sales[0].createdAt)
        }

        return {
            id: c.id,
            name: c.name || "-",
            phone: c.phone || "",
            email: c.email || "",
            city: c.city || "",
            district: c.district || "",
            type: c.type as "INDIVIDUAL" | "CORPORATE",
            gender: c.gender || "-",
            salesCount: c.sales.length,
            totalSpent: totalSpent,
            lastPurchaseDate: lastPurchaseDate,
            createdAt: c.createdAt
        }
    })

    return (
        <div className="h-[calc(100vh-6rem)]">
            <CustomerListClient initialData={gridData} />
        </div>
    )
}
