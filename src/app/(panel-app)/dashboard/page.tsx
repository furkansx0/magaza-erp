import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Package, CreditCard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { RecentSales } from "@/components/dashboard/recent-sales";

export default async function DashboardPage() {
    const totalStores = await db.store.count();

    // Count Models (Unique Products) vs Variants (SKUs)
    const totalModels = await db.productModel.count();
    const totalVariants = await db.productVariant.count();

    // --- Sales Stats ---
    const totalSalesCount = await db.sale.count();

    const totalRevenueAgg = await db.sale.aggregate({
        _sum: { totalAmount: true }
    });
    const totalRevenue = totalRevenueAgg._sum.totalAmount || 0;

    // Today's Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySalesCount = await db.sale.count({
        where: {
            createdAt: {
                gte: today
            }
        }
    });

    const todayRevenueAgg = await db.sale.aggregate({
        where: {
            createdAt: {
                gte: today
            }
        },
        _sum: { totalAmount: true }
    });
    const todayRevenue = todayRevenueAgg._sum.totalAmount || 0;

    // Recent Sales
    const recentSales = await db.sale.findMany({
        take: 10, // Increased to 10
        orderBy: { createdAt: 'desc' },
        include: {
            cashier: true,
            customer: true,
            payments: true,
            store: true, // For detail view
            items: {
                include: {
                    salesRep: true, // Include Sales Rep
                    variant: {
                        include: {
                            model: true
                        }
                    }
                }
            }
        }
    });

    const stockAggregate = await db.stock.aggregate({
        _sum: { quantity: true }
    });
    const totalStockCount = stockAggregate._sum.quantity || 0;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* Total Revenue */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Ciro</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(totalRevenue))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Bugün: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(todayRevenue))}
                        </p>
                    </CardContent>
                </Card>

                {/* Total Sales Count */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam İşlem</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSalesCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Bugün: {todaySalesCount} işlem
                        </p>
                    </CardContent>
                </Card>

                {/* Real Product Stocks */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stok Durumu</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStockCount} Adet</div>
                        <p className="text-xs text-muted-foreground">
                            {totalModels} Model / {totalVariants} Çeşit (SKU)
                        </p>
                    </CardContent>
                </Card>

                {/* Active Stores */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Şubeler</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStores}</div>
                    </CardContent>
                </Card>

            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle className="text-lg flex justify-between items-center">
                            <span>Günlük Mağaza Faaliyet Raporu</span>
                            <span className="text-sm font-normal text-muted-foreground">Son İşlemler</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <RecentSales sales={recentSales.map(s => ({
                            ...s,
                            totalAmount: Number(s.totalAmount),
                            payments: s.payments.map(p => ({ ...p, amount: Number(p.amount) })),
                            items: s.items.map(i => ({
                                ...i,
                                price: Number(i.price),
                                salesRepName: i.salesRep?.name || i.salesRep?.username || null, // Map Sales Rep Name
                                variant: {
                                    ...i.variant,
                                    salePrice: Number(i.variant.salePrice),
                                    purchasePrice: Number(i.variant.purchasePrice)
                                }
                            }))
                        }))} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
