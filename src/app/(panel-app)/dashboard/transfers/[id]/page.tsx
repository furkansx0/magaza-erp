import { db } from "@/lib/db";
import { TransferDetailView } from "@/components/transfers/transfer-detail-view";
import { notFound } from "next/navigation";
import { PendingTransferProcessView } from "@/components/transfers/pending-transfer-process-view";

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const transfer = await db.stockTransfer.findUnique({
        where: { id },
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
        }
    });

    if (!transfer) {
        notFound();
    }

    // Serialize Date and Decimal fields
    const serializedTransfer = {
        ...transfer,
        createdAt: transfer.createdAt.toISOString(),
        updatedAt: transfer.updatedAt.toISOString(),
        sentAt: transfer.sentAt?.toISOString() || null,
        receivedAt: transfer.receivedAt?.toISOString() || null,
        items: transfer.items.map((item) => ({
            ...item,
            variant: {
                ...item.variant,
                purchasePrice: item.variant.purchasePrice.toNumber(),
                salePrice: item.variant.salePrice.toNumber(),
                secondPrice: item.variant.secondPrice ? item.variant.secondPrice.toNumber() : null,
            }
        }))
    };

    return (
        <div className="p-8">
            {transfer.status === "PENDING" ? (
                <PendingTransferProcessView transfer={serializedTransfer as any} />
            ) : (
                <TransferDetailView transfer={serializedTransfer as any} />
            )}
        </div>
    )
}
