import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GiftCardList } from "@/components/customers/gift-card-list"
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog"
import { CustomerAnalytics, AnalyticsData } from "@/components/customers/customer-analytics"
import { CustomerSalesHistory, SaleHistoryItem } from "@/components/customers/customer-sales-history"
import { CustomerProductMatrix, MatrixData } from "@/components/customers/customer-product-matrix"
import { Phone, Mail, MapPin, Building2, User, Ticket } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CustomerGiftCardsDialog } from "@/components/customers/customer-gift-cards-dialog"

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    // Deep Fetch for Analytics
    const rawCustomer = await prisma.customer.findUnique({
        where: { id },
        include: {
            giftCards: {
                orderBy: { createdAt: 'desc' },
                include: {
                    campaign: true,
                    salePayments: {
                        include: {
                            sale: true
                        }
                    }
                }
            },
            sales: {
                orderBy: { createdAt: 'desc' },
                include: {
                    store: true,
                    cashier: true,
                    payments: true,
                    items: {
                        include: {
                            variant: {
                                include: {
                                    model: true
                                }
                            },
                            salesRep: true // Added info
                        }
                    }
                }
            }
        }
    })

    if (!rawCustomer) notFound()

    // 1. Calculate Analytics
    const totalOrders = rawCustomer.sales.length
    const ltv = rawCustomer.sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0)
    const aov = totalOrders > 0 ? ltv / totalOrders : 0

    // Return Rate: Count sales that are net negative
    const returnCount = rawCustomer.sales.filter(s => Number(s.totalAmount) < 0).length
    const returnRate = totalOrders > 0 ? (returnCount / totalOrders) * 100 : 0

    const lastVisitDate = totalOrders > 0 ? rawCustomer.sales[0].createdAt : null

    // Preferred Store Logic
    const storeCounts: Record<string, number> = {}
    rawCustomer.sales.forEach(s => {
        const storeName = s.store.name
        storeCounts[storeName] = (storeCounts[storeName] || 0) + 1
    })
    const preferredStore = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"

    const analyticsData: AnalyticsData = {
        ltv,
        aov,
        totalOrders,
        returnRate,
        lastVisitDate
    }

    // 2. Process Sales History
    const salesHistory: SaleHistoryItem[] = rawCustomer.sales.map(sale => ({
        id: sale.id,
        date: sale.createdAt,
        storeName: sale.store.name,
        totalAmount: Number(sale.totalAmount),
        isReturn: Number(sale.totalAmount) < 0,
        cashierName: sale.cashier.name || sale.cashier.username,
        paymentMethods: sale.payments.map(p => ({
            method: p.method,
            amount: Number(p.amount),
            giftCardId: p.giftCardId || undefined
        })),
        items: sale.items.map(item => ({
            id: item.id,
            sku: item.variant.sku || item.variant.barcode,
            name: item.variant.model.name,
            variantName: `${item.variant.color || ""} ${item.variant.size || ""}`.trim(),
            quantity: item.quantity,
            price: Number(item.price),
            isReturn: item.quantity < 0,
            salesRepName: item.salesRep ? (item.salesRep.name || item.salesRep.username) : null // Mapped
        }))
    }))

    // 3. Process Product Matrix
    const categoryCount: Record<string, number> = {}
    const colorCount: Record<string, number> = {}
    const sizeCount: Record<string, number> = {}
    const brandCount: Record<string, number> = {}
    let totalItems = 0

    rawCustomer.sales.forEach(sale => {
        sale.items.forEach(item => {
            if (item.quantity > 0) { // Only count purchases
                const q = item.quantity
                totalItems += q

                const cat = item.variant.model.category || "Diğer"
                categoryCount[cat] = (categoryCount[cat] || 0) + q

                if (item.variant.color) colorCount[item.variant.color] = (colorCount[item.variant.color] || 0) + q
                if (item.variant.size) sizeCount[item.variant.size] = (sizeCount[item.variant.size] || 0) + q
                if (item.variant.model.brand) brandCount[item.variant.model.brand] = (brandCount[item.variant.model.brand] || 0) + q
            }
        })
    })

    const topCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({ name, count, percentage: (count / totalItems) * 100 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)

    const getTop = (obj: Record<string, number>) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || ""

    const matrixData: MatrixData = {
        topCategories,
        favoriteColor: getTop(colorCount),
        favoriteSize: getTop(sizeCount),
        favoriteBrand: getTop(brandCount),
        preferredStore
    }

    // Serialize Customer for Dialog
    const serializedCustomer = {
        ...rawCustomer,
        giftCards: rawCustomer.giftCards.map(c => ({
            ...c,
            initialAmount: Number(c.initialAmount),
            remainingBalance: Number(c.remainingBalance),
            percentage: c.percentage,
            salePayments: c.salePayments.map(sp => ({
                ...sp,
                amount: Number(sp.amount),
                sale: {
                    ...sp.sale,
                    totalAmount: Number(sp.sale.totalAmount)
                }
            })),
            campaign: c.campaign
        })),
        sales: [] // We don't need to pass massive sales data to the Edit Dialog
    }

    return (
        <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-sm">
            {/* 1. Header & Profile */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border shadow-sm items-start md:items-center justify-between">
                <div className="flex gap-4 items-center">
                    <div className="h-16 w-16 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center text-2xl font-bold border border-blue-100">
                        {rawCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-gray-900">{rawCustomer.name}</h1>
                            {rawCustomer.type === "CORPORATE" && <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded border border-indigo-100 font-medium">KURUMSAL</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {rawCustomer.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {rawCustomer.phone}</div>}
                            {rawCustomer.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {rawCustomer.email}</div>}
                            {(rawCustomer.city || rawCustomer.district) && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {rawCustomer.district}/{rawCustomer.city}</div>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <CustomerGiftCardsDialog customer={serializedCustomer} giftCards={serializedCustomer.giftCards} />
                    <EditCustomerDialog customer={serializedCustomer} />
                </div>
            </div>

            {/* 2. Analytics Board */}
            <CustomerAnalytics data={analyticsData} />

            {/* 3. Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">

                {/* Left: Sales History (Dense) */}
                <div className="lg:col-span-3 space-y-4">
                    <Tabs defaultValue="history" className="w-full">
                        <div className="flex justify-between items-center mb-2">
                            <TabsList className="h-8">
                                <TabsTrigger value="history" className="text-xs">Satış Geçmişi ({totalOrders})</TabsTrigger>
                                <TabsTrigger value="active_orders" className="text-xs" disabled>Aktif Siparişler (0)</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="history" className="m-0">
                            <CustomerSalesHistory sales={salesHistory} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right: Matrix Only */}
                <div className="lg:col-span-1 space-y-4">
                    <CustomerProductMatrix data={matrixData} />
                </div>

            </div>
        </div>
    )
}
