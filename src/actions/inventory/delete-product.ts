"use server"

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Hard Delete Model (and all variants/stocks via Cascade)
export async function deleteProductModel(modelId: string) {
    try {
        // 1. Check if any variant of this model has sales
        const salesCount = await prisma.saleItem.count({
            where: {
                variant: {
                    modelId: modelId
                }
            }
        });

        if (salesCount > 0) {
            return {
                success: false,
                message: "Bu ürüne ait satış geçmişi bulunduğu için tamamen SİLİNEMEZ. Lütfen 'Arşivle' (Göz ikonu) seçeneğini kullanarak pasife alın."
            };
        }

        await prisma.productModel.delete({
            where: { id: modelId }
        });
        revalidatePath("/dashboard/products");
        return { success: true, message: "Model ve tüm varyantları başarıyla silindi." };
    } catch (error) {
        console.error("Delete Model Error:", error);
        return { success: false, message: `Model silinirken hata oluştu: ${(error as Error).message}` };
    }
}

// Hard Delete Variant (and stocks via Cascade)
export async function deleteProductVariant(variantId: string) {
    try {
        // 1. Check for sales
        const salesCount = await prisma.saleItem.count({
            where: {
                variantId: variantId
            }
        });

        if (salesCount > 0) {
            return {
                success: false,
                message: "Bu varyantın satış geçmişi olduğu için silinemez. Lütfen pasife alın."
            };
        }

        await prisma.productVariant.delete({
            where: { id: variantId }
        });
        revalidatePath("/dashboard/products");
        return { success: true, message: "Varyant başarıyla silindi." };
    } catch (error) {
        console.error("Delete Variant Error:", error);
        return { success: false, message: `Varyant silinirken hata oluştu: ${(error as Error).message}` };
    }
}

// Hard Delete All Variants of a specific Color in a Model
export async function deleteProductColorGroup(modelId: string, color: string) {
    try {
        // 1. Check for sales in this color group
        const salesCount = await prisma.saleItem.count({
            where: {
                variant: {
                    modelId: modelId,
                    color: color
                }
            }
        });

        if (salesCount > 0) {
            return {
                success: false,
                message: "Bu renk grubunda satış geçmişi olan ürünler var. Silinemez, lütfen pasife alın."
            };
        }

        /* 
           Prisma doesn't support deleteMany with complex relations easily in one go if we wanted to be super specific,
           but here we can just delete variants matching modelId and color.
        */
        const result = await prisma.productVariant.deleteMany({
            where: {
                modelId: modelId,
                color: {
                    equals: color // Matches exact color name
                }
            }
        });

        revalidatePath("/dashboard/products");
        return { success: true, message: `${result.count} adet ürün (renk grubu) silindi.` };
    } catch (error) {
        console.error("Delete Color Group Error:", error);
        return { success: false, message: "Renk grubu silinirken hata oluştu." };
    }
}
