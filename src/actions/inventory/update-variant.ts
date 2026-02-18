"use server"

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdateVariantSchema = z.object({
    variantId: z.string(),
    barcode: z.string().min(1, "Barkod boş olamaz"),
    sku: z.string().optional(),
    purchasePrice: z.number().min(0),
    salePrice: z.number().min(0),
    stocks: z.record(z.string(), z.number()) // storeId -> quantity
});

export async function updateProductVariant(data: z.infer<typeof UpdateVariantSchema>) {
    try {
        const { variantId, barcode, sku, purchasePrice, salePrice, stocks } = UpdateVariantSchema.parse(data);

        await prisma.$transaction(async (tx: any) => {
            // 1. Update Basic Variant Info
            await tx.productVariant.update({
                where: { id: variantId },
                data: {
                    barcode,
                    sku,
                    purchasePrice,
                    salePrice
                }
            });

            // 2. Update Stocks for each store
            for (const [storeId, quantity] of Object.entries(stocks)) {
                if (quantity < 0) throw new Error("Stok negatif olamaz");

                await tx.stock.upsert({
                    where: {
                        variantId_storeId: {
                            variantId,
                            storeId
                        }
                    },
                    update: { quantity },
                    create: {
                        variantId,
                        storeId,
                        quantity
                    }
                });
            }
        });

        revalidatePath("/dashboard/products");
        return { success: true, message: "Ürün bilgileri güncellendi." };

    } catch (error: unknown) {
        console.error("Update error:", error);
        let message = "Güncelleme başarısız.";
        if (error instanceof Error) {
            message = error.message;
        }
        return { success: false, message };
    }
}
