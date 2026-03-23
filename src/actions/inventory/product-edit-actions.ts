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

        // Bütünlük koruması (Transaction) içerisine alınıyor
        await db.$transaction(async (tx) => {
            // 1. Update Model
            await tx.productModel.update({
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
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variant.id);

                if (isUUID) {
                    // UPDATE Existing Variant
                    await tx.productVariant.update({
                        where: { id: variant.id },
                        data: {
                            purchasePrice: Number(variant.purchasePrice),
                            salePrice: Number(variant.salePrice),
                        }
                    })

                    // Update Stocks for this Variant
                    if (variant.stocks) {
                        for (const [storeId, quantity] of Object.entries(variant.stocks)) {
                            await tx.stock.upsert({
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
                    const newVariant = await tx.productVariant.create({
                        data: {
                            modelId: data.id,
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
                            await tx.stock.create({
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
        }); // END TRANSACTION
        revalidatePath("/dashboard/products")
        return { success: true, message: "Ürün ve varyantlar güncellendi." }

    } catch (error: any) {
        console.error("Update Product Error:", error)
        return { success: false, message: "Güncelleme hatası: " + error.message }
    }
}
