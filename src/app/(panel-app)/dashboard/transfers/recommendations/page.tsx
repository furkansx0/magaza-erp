import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Package, Truck } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"

export default async function RecommendationsPage() {
    const recommendations = await prisma.stockTransfer.findMany({
        where: { status: "RECOMMENDED" },
        include: {
            sourceStore: true,
            targetStore: true,
            items: true
        },
        orderBy: { createdAt: 'desc' }
    });

    // Group by Source Store
    const groupedStuff = new Map<string, {
        storeName: string,
        totalQty: number,
        transfers: typeof recommendations
    }>();

    for (const rec of recommendations) {
        const key = rec.sourceStoreId;
        const current = groupedStuff.get(key) || {
            storeName: rec.sourceStore.name,
            totalQty: 0,
            transfers: []
        };

        current.transfers.push(rec);
        // Calculate total items in this transfer
        const qty = rec.items.reduce((acc, item) => acc + item.quantitySent, 0);
        current.totalQty += qty;

        groupedStuff.set(key, current);
    }

    const groups = Array.from(groupedStuff.values());

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-gray-100">Transfer Önerileri</h1>
                    <p className="text-muted-foreground mt-1">Sistem tarafından hesaplanan stok dengeleme önerileri.</p>
                </div>
            </div>

            {groups.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-gray-50 dark:bg-zinc-900/50">
                    <Package className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Öneri Bulunamadı</h3>
                    <p className="text-muted-foreground text-sm max-w-sm text-center mt-2">
                        Şu an için stok dengelemesi gerekmiyor veya öneriler henüz oluşturulmadı.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                    <Card key={group.storeName} className={`border-2 ${group.totalQty >= 50 ? 'border-green-500/50 dark:border-green-500/30' : 'border-amber-500/50 dark:border-amber-500/30'}`}>
                        <CardHeader className="bg-gray-50/50 dark:bg-zinc-900/50 pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kaynak Mağaza</div>
                                    <CardTitle className="text-xl">{group.storeName}</CardTitle>
                                </div>
                                <Badge variant={group.totalQty >= 50 ? "default" : "secondary"} className={group.totalQty >= 50 ? "bg-green-600" : ""}>
                                    Toplam: {group.totalQty} Ürün
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {group.transfers.map(t => {
                                    const itemCount = t.items.reduce((a, b) => a + b.quantitySent, 0);
                                    return (
                                        <div key={t.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border rounded-lg shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                                    <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                        Hedef: {t.targetStore.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {itemCount} kalem ürün
                                                    </div>
                                                </div>
                                            </div>
                                            <Link href={`/dashboard/transfers/${t.id}`}>
                                                <Button size="sm" variant="outline" className="h-8">
                                                    İncele <ArrowRight className="w-3 h-3 ml-2" />
                                                </Button>
                                            </Link>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
