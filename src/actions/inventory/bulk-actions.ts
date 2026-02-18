"use server"

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type BulkPriceOperation = {
    type: "PERCENTAGE_INCREASE" | "PERCENTAGE_DECREASE" | "SET_FIXED_PRICE";
    value: number;
}

export async function bulkUpdatePrice(variantIds: string[], operation: BulkPriceOperation) {
    try {
        if (variantIds.length === 0) return { success: false, error: "Ürün seçilmedi." };

        // Transactional update for safety
        await db.$transaction(async (tx) => {
            // Fetch current prices to calculate %
            const variants = await tx.productVariant.findMany({
                where: { id: { in: variantIds } }
            });

            for (const variant of variants) {
                let newPrice = Number(variant.salePrice);

                if (operation.type === "PERCENTAGE_INCREASE") {
                    newPrice = newPrice * (1 + operation.value / 100);
                } else if (operation.type === "PERCENTAGE_DECREASE") {
                    newPrice = newPrice * (1 - operation.value / 100);
                } else if (operation.type === "SET_FIXED_PRICE") {
                    newPrice = operation.value;
                }

                await tx.productVariant.update({
                    where: { id: variant.id },
                    data: { salePrice: newPrice }
                });
            }
        });

        revalidatePath("/dashboard/products");
        return { success: true, message: `${variantIds.length} ürünün fiyatı güncellendi.` };

    } catch (error) {
        console.error("Bulk Price Update Error:", error);
        return { success: false, error: "Toplu güncelleme başarısız." };
    }
}

export async function bulkArchive(variantIds: string[]) {
    try {
        // Archive Variants
        const res = await db.productVariant.updateMany({
            where: { id: { in: variantIds } },
            data: { isArchived: true }
        });

        revalidatePath("/dashboard/products");
        return { success: true, message: `${res.count} ürün arşivlendi.` };
    } catch (error) {
        return { success: false, error: "Arşivleme başarısız." };
    }
}


export async function bulkUnarchive(variantIds: string[]) {
    try {
        const res = await db.productVariant.updateMany({
            where: { id: { in: variantIds } },
            data: { isArchived: false }
        });

        revalidatePath("/dashboard/products");
        return { success: true, message: `${res.count} ürün arşivden çıkarıldı.` };
    } catch (error) {
        return { success: false, error: "İşlem başarısız." };
        return { success: false, error: "İşlem başarısız." };
    }
}

export async function bulkDelete(variantIds: string[]) {
    try {
        let deletedCount = 0;
        let skippedCount = 0;

        await db.$transaction(async (tx) => {
            // 1. Fetch variants with their sales count
            const variantsToCheck = await tx.productVariant.findMany({
                where: { id: { in: variantIds } },
                include: {
                    _count: {
                        select: { saleItems: true }
                    }
                }
            });

            const idsToDelete: string[] = [];

            for (const v of variantsToCheck) {
                // Check if sold
                if (v._count.saleItems > 0) {
                    skippedCount++;
                    continue;
                }

                // Check for Stock History / Transfers
                const movementCount = await tx.stockMovement.count({ where: { variantId: v.id } });
                const transferCount = await tx.stockTransferItem.count({ where: { variantId: v.id } });

                if (movementCount > 0 || transferCount > 0) {
                    skippedCount++;
                } else {
                    idsToDelete.push(v.id);
                }
            }

            if (idsToDelete.length > 0) {
                // Delete Variants (Safe to delete as we verified no history exists)
                await tx.productVariant.deleteMany({
                    where: { id: { in: idsToDelete } }
                });

                deletedCount = idsToDelete.length;
            }
        });

        revalidatePath("/dashboard/products");

        if (skippedCount > 0) {
            return {
                success: true,
                message: `${deletedCount} ürün silindi. ${skippedCount} ürünün satış veya transfer geçmişi olduğu için silinemedi (arşivleyebilirsiniz).`,
                partial: true
            };
        }

        return { success: true, message: `${deletedCount} ürün kalıcı olarak silindi.` };

    } catch (error: any) {
        console.error("Bulk Delete Error:", error);
        return { success: false, error: "Silme işlemi sırasında hata oluştu: " + error.message };
    }
}
