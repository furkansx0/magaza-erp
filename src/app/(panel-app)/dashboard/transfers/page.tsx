
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plane, Truck, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { PendingTransfersDialog } from "@/components/transfers/pending-transfers-dialog";
import { RecommendedTransfersView } from "@/components/transfers/recommended-transfers-view";

export default async function TransferListPage() {
    const allTransfers = await prisma.stockTransfer.findMany({
        include: {
            sourceStore: true,
            targetStore: true,
            items: {
                include: {
                    variant: {
                        include: {
                            model: true,
                            stocks: true
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const recommendations = allTransfers.filter(t => t.status === "RECOMMENDED").map(t => ({
        ...t,
        items: t.items.map(i => ({
            ...i,
            variant: {
                ...i.variant,
                purchasePrice: Number(i.variant.purchasePrice),
                salePrice: Number(i.variant.salePrice),
                secondPrice: i.variant.secondPrice ? Number(i.variant.secondPrice) : null
            }
        }))
    }));
    const transfers = allTransfers.filter(t => t.status !== "RECOMMENDED").map(t => ({
        ...t,
        items: t.items.map(i => ({
            ...i,
            variant: {
                ...i.variant,
                purchasePrice: Number(i.variant.purchasePrice),
                salePrice: Number(i.variant.salePrice),
                secondPrice: i.variant.secondPrice ? Number(i.variant.secondPrice) : null
            }
        }))
    }));
    const pendingTransfers = transfers.filter(t => t.status === "PENDING");

    return (
        <div className="flex flex-col p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Stok Transferleri</h2>
                    <p className="text-muted-foreground">Mağazalar arası sevkiyat ve mal kabul işlemleri.</p>
                </div>
                <div className="flex items-center gap-3">
                    <RecommendedTransfersView recommendations={recommendations} />
                    <PendingTransfersDialog transfers={pendingTransfers} />
                    <Link href="/dashboard/transfers/new">
                        <Button>+ Yeni Transfer Oluştur</Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-4">
                {transfers.length === 0 ? (
                    <div className="border rounded-lg p-12 text-center text-muted-foreground bg-gray-50">
                        Henüz hiç transfer kaydı yok.
                    </div>
                ) : (
                    transfers.map(transfer => {
                        const totalItems = transfer.items.reduce((acc, i) => acc + i.quantitySent, 0);

                        let statusBadge;
                        switch (transfer.status) {
                            case "RECOMMENDED": statusBadge = <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">Öneri</Badge>; break;
                            case "PENDING": statusBadge = <Badge variant="secondary" className="bg-gray-200">Hazırlanıyor</Badge>; break;
                            case "SENT": statusBadge = <Badge className="bg-orange-500 hover:bg-orange-600"><Truck className="w-3 h-3 mr-1" /> Yolda</Badge>; break;
                            case "COMPLETED": statusBadge = <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Tamamlandı</Badge>; break;
                            default: statusBadge = <Badge variant="outline">{transfer.status}</Badge>;
                        }

                        return (
                            <div key={transfer.id} className="flex flex-col md:flex-row items-center justify-between p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col space-y-1 mb-4 md:mb-0 w-full md:w-auto">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-lg">{transfer.transferNo}</span>
                                        {statusBadge}
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                                        <span>{format(transfer.createdAt, "d MMMM yyyy HH:mm", { locale: tr })}</span>
                                        <span>•</span>
                                        <span>{totalItems} Ürün</span>
                                        {transfer.note && (
                                            <>
                                                <span>•</span>
                                                <span className="text-blue-600 font-medium">{transfer.note}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="font-medium">{transfer.sourceStore.name}</div>
                                            <div className="text-xs text-muted-foreground">Çıkış</div>
                                        </div>
                                        <ArrowRight className="text-gray-400" />
                                        <div>
                                            <div className="font-medium">{transfer.targetStore.name}</div>
                                            <div className="text-xs text-muted-foreground">Varış</div>
                                        </div>
                                    </div>

                                    <Link href={`/dashboard/transfers/${transfer.id}`}>
                                        <Button variant="outline" size="sm">Detay</Button>
                                    </Link>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
