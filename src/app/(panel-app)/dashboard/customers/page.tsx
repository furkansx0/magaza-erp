import { prisma } from "@/lib/db"
import { CustomerGridView, CustomerGridRow } from "@/components/customers/customer-grid-view"

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
    // Fetch all customers for client-side virtualization (similar to Products)
    // We include Sales to calculate stats
    const customers = await prisma.customer.findMany({
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

    // Transform data for the grid
    const gridData: CustomerGridRow[] = customers.map(c => {
        // Simple client-side aggregation since we have the data
        const totalSpent = c.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)

        // Find last purchase date
        let lastPurchaseDate: Date | null = null
        if (c.sales.length > 0) {
            // efficient enough for small arrays, otherwise sort
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
        <div className="h-[calc(100vh-6rem)]"> {/* Full height wrapper */}
            <CustomerGridView data={gridData} />
        </div>
    )
}
