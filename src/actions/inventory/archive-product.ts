"use server"

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/settings/audit-actions";

// Toggle Archive Status for Model
export async function toggleModelArchive(modelId: string, isArchived: boolean) {
    try {
        await prisma.productModel.update({
            where: { id: modelId },
            data: { isArchived }
        });
        await createAuditLog({
            action: isArchived ? "PRODUCT_ARCHIVE" : "PRODUCT_ACTIVATE",
            entity: "ProductModel",
            entityId: modelId,
            details: `Model durumu güncellendi: ${isArchived ? "Pasif" : "Aktif"}`
        });
        revalidatePath("/dashboard/products");
        return { success: true, message: isArchived ? "Model arşivlendi (Pasife alındı)." : "Model arşivden çıkarıldı (Aktif)." };
    } catch (error) {
        console.error("Archive Model Error:", error);
        return { success: false, message: `Model arşivlenirken hata: ${(error as Error).message}` };
    }
}

// Toggle Archive Status for Variant
export async function toggleVariantArchive(variantId: string, isArchived: boolean) {
    try {
        await prisma.productVariant.update({
            where: { id: variantId },
            data: { isArchived }
        });
        revalidatePath("/dashboard/products");
        return { success: true, message: isArchived ? "Varyant pasife alındı." : "Varyant aktif edildi." };
    } catch (error) {
        console.error("Archive Variant Error:", error);
        return { success: false, message: `Varyant arşivlenirken hata: ${(error as Error).message}` };
    }
}

// Toggle Archive Status for Store Stock (Store Specific Passive)
// Toggle Archive Status for Store Stock (Store Specific Passive)
export async function toggleStockArchive(variantId: string, storeId: string, isArchived: boolean) {
    try {
        await prisma.stock.upsert({
            where: {
                variantId_storeId: {
                    variantId,
                    storeId
                }
            },
            update: { isArchived },
            create: {
                variantId,
                storeId,
                isArchived,
                quantity: 0
            }
        });
        revalidatePath("/dashboard/products");
        return { success: true, message: isArchived ? "Stok mağaza için pasife alındı." : "Stok mağaza için aktif edildi." };
    } catch (error) {
        console.error("Archive Stock Error:", error);
        return { success: false, message: `Stok arşivlenirken hata: ${(error as Error).message}` };
    }
}

// Update: Toggle Archive Status for ALL Variants of a Model for a Specific Store
// Update: Toggle Archive Status for ALL Variants of a Model for a Specific Store
export async function toggleModelStockArchive(modelId: string, storeId: string, isArchived: boolean) {
    try {
        // Find all variants of the model
        const variants = await prisma.productVariant.findMany({
            where: { modelId: modelId },
            select: { id: true }
        });

        const variantIds = variants.map(v => v.id);

        if (variantIds.length === 0) {
            return { success: true, message: "Model altında varyant bulunamadı." };
        }

        // Loop and upsert for each variant because updateMany won't create missing records
        // Using Promise.all for parallel execution
        await Promise.all(variantIds.map(variantId =>
            prisma.stock.upsert({
                where: {
                    variantId_storeId: {
                        variantId,
                        storeId
                    }
                },
                update: { isArchived },
                create: {
                    variantId,
                    storeId,
                    isArchived,
                    quantity: 0
                }
            })
        ));

        revalidatePath("/dashboard/products");
        return { success: true, message: isArchived ? "Model bu mağaza için pasife alındı." : "Model bu mağaza için aktif edildi." };

    } catch (error) {
        console.error("Archive Model Stock Error:", error);
        return { success: false, message: `Mağaza durumu güncellenirken hata: ${(error as Error).message}` };
    }
}
