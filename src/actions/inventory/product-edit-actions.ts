"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

/**
 * Updates a Product Model and its Variants/Stocks.
 * Handles both existing and new variants.
 */
export async function updateProductMatrix(data: {
    id: string
    name: string
    modelCode?: string
    brand?: string
    gender?: string
    category?: string
    subCategory?: string
    material?: string
    style?: string
    season?: string
    description?: string
    variants: any[]
}) {
    try {
        console.log("Updating Product:", data.id)

        // 1. Update Model
        await db.productModel.update({
            where: { id: data.id },
            data: {
                name: data.name,
                modelCode: data.modelCode,
                brand: data.brand,
                gender: data.gender,
                category: data.category,
                subCategory: data.subCategory,
                material: data.material,
                style: data.style,
                season: data.season,
                description: data.description,
                updatedAt: new Date()
            }
        })

        // 2. Process Variants
        for (const variant of data.variants) {
            // Check if it's an existing variant (ID exists in DB)
            // The wizard generates random IDs for new rows like "Siyah-M-0.123".
            // Real IDs are UUIDs. We can check if it exists in DB or check format.
            // Better to check DB or rely on a flag, but looking up is safe.

            // However, ensuring we don't accidentally create duplicates if ID is somehow lost is important.
            // For now, if the ID looks like a UUID, we try to update.
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variant.id);

            if (isUUID) {
                // UPDATE Existing Variant
                await db.productVariant.update({
                    where: { id: variant.id },
                    data: {
                        // name is likely transient or computed, not in DB
                        purchasePrice: Number(variant.purchasePrice),
                        salePrice: Number(variant.salePrice),
                        // Barcode and SKU are usually locked but if passed and valid we could update.
                        // User said restricted, but simple update is fine if UI passes it.
                        // We will trust the UI locked state, but here we can optionally update if needed.
                        // Let's update them if they changed, assuming UI let them.
                    }
                })

                // Update Stocks for this Variant
                if (variant.stocks) {
                    for (const [storeId, quantity] of Object.entries(variant.stocks)) {
                        await db.stock.upsert({
                            where: {
                                variantId_storeId: {
                                    variantId: variant.id,
                                    storeId: storeId
                                }
                            },
                            create: {
                                variantId: variant.id,
                                storeId: storeId,
                                quantity: Number(quantity)
                            },
                            update: {
                                quantity: Number(quantity)
                            }
                        })
                    }
                }

            } else {
                // CREATE New Variant (Added during edit)
                const newVariant = await db.productVariant.create({
                    data: {
                        modelId: data.id,
                        // name: `${data.name} - ${variant.color} - ${variant.size}`,
                        sku: variant.sku,
                        barcode: variant.barcode,
                        color: variant.color,
                        size: variant.size,
                        purchasePrice: Number(variant.purchasePrice),
                        salePrice: Number(variant.salePrice),
                    }
                })

                // Create Stocks
                if (variant.stocks) {
                    for (const [storeId, quantity] of Object.entries(variant.stocks)) {
                        await db.stock.create({
                            data: {
                                variantId: newVariant.id,
                                storeId: storeId,
                                quantity: Number(quantity)
                            }
                        })
                    }
                }
            }
        }





        revalidatePath("/dashboard/products")
        return { success: true, message: "Ürün ve varyantlar güncellendi." }

    } catch (error: any) {
        console.error("Update Product Error:", error)
        return { success: false, message: "Güncelleme hatası: " + error.message }
    }
}
