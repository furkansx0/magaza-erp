"use server"

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Reuse existing BulkPriceOperation if needed, but this is separate.

// Update signature to use variantIds
export async function bulkCreateTransfer(variantIds: string[], sourceStoreId: string, targetStoreId: string) {
    try {
        if (variantIds.length === 0) return { success: false, error: "Ürün seçilmedi." };
        if (sourceStoreId === targetStoreId) return { success: false, error: "Kaynak ve hedef aynı olamaz." };

        // 1. Find variants directly
        const variants = await prisma.productVariant.findMany({
            where: {
                id: { in: variantIds },
                isArchived: false
            },
            include: {
                stocks: {
                    where: { storeId: sourceStoreId }
                }
            }
        });

        // 2. Filter variants that actually have stock in source store
        const itemsToTransfer = variants.map(v => {
            const stock = v.stocks[0]; // Since we filtered include by storeId, this is the specific stock
            return {
                variantId: v.id,
                quantity: stock ? stock.quantity : 0
            };
        }).filter(item => item.quantity > 0);

        if (itemsToTransfer.length === 0) {
            return { success: false, error: "Seçili ürünlerin kaynak mağazada stoğu yok." };
        }

        // 3. Perform Direct Transfer (Transaction)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const transferNo = `TRF-BULK-${dateStr}-${randomSuffix}`;

        const transferId = await prisma.$transaction(async (tx) => {
            // A. Create Transfer Record (Completed)
            const transfer = await tx.stockTransfer.create({
                data: {
                    transferNo,
                    sourceStoreId,
                    targetStoreId,
                    note: `Toplu Hızlı Transfer (${itemsToTransfer.length} kalem)`,
                    status: "COMPLETED",
                    sentAt: new Date(),
                    receivedAt: new Date(),
                    items: {
                        create: itemsToTransfer.map(item => ({
                            variantId: item.variantId,
                            quantitySent: item.quantity,
                            quantityReceived: item.quantity // Auto-received
                        }))
                    }
                }
            });

            // B. Update Stocks & Create Movements
            for (const item of itemsToTransfer) {
                // 1. Decrement Source
                const sourceStock = await tx.stock.findUnique({
                    where: { variantId_storeId: { variantId: item.variantId, storeId: sourceStoreId } }
                });

                // Ensure source stock exists
                if (sourceStock) {
                    const newSourceQty = sourceStock.quantity - item.quantity;
                    await tx.stock.update({
                        where: { id: sourceStock.id },
                        data: { quantity: newSourceQty }
                    });

                    // Log Movement (OUT)
                    await tx.stockMovement.create({
                        data: {
                            variantId: item.variantId,
                            storeId: sourceStoreId,
                            quantity: -item.quantity,
                            balanceAfter: newSourceQty,
                            type: "TRANSFER_OUT",
                            reason: `Transfer #${transferNo} -> ${targetStoreId}`,
                            referenceId: transfer.id
                        }
                    });
                }

                // 2. Increment Target
                const targetStock = await tx.stock.upsert({
                    where: { variantId_storeId: { variantId: item.variantId, storeId: targetStoreId } },
                    create: {
                        variantId: item.variantId,
                        storeId: targetStoreId,
                        quantity: item.quantity
                    },
                    update: {
                        quantity: { increment: item.quantity }
                    }
                });

                // Log Movement (IN)
                await tx.stockMovement.create({
                    data: {
                        variantId: item.variantId,
                        storeId: targetStoreId,
                        quantity: item.quantity,
                        balanceAfter: targetStock.quantity,
                        type: "TRANSFER_IN",
                        reason: `Transfer #${transferNo} <- ${sourceStoreId}`,
                        referenceId: transfer.id
                    }
                });
            }

            return transfer.id;
        });

        revalidatePath("/dashboard/transfers");
        revalidatePath("/dashboard/products"); // Refresh grid totals
        return { success: true, message: `${itemsToTransfer.length} kalem ürün başarıyla transfer edildi.`, transferId };

    } catch (error) {
        console.error("Bulk Transfer Error:", error);
        return { success: false, error: "Transfer işlemi sırasında hata oluştu." };
    }
}
