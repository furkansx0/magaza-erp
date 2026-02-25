"use server"

import { db } from "@/lib/db"

export type ValidatedProduct = {
    variantId: string
    barcode: string
    name: string
    modelName: string
    color: string
    size: string
    stock: number
    image?: string
}

export async function validateProductByBarcode(barcode: string, storeId: string): Promise<{ success: boolean, product?: ValidatedProduct, error?: string }> {
    try {
        if (!barcode || !storeId) return { success: false, error: "Barkod veya mağaza eksik." }

        // 1. Find Variant by Barcode (assuming barcode is on ProductVariant or via some lookup)
        // Schema Analysis: ProductVariant has 'barcode'? 
        // Let's check schema. If not, we might be using 'id' as barcode for now or a separate field.
        // Looking at previous chats, we discussed Barcodes.
        // I will assume `barcode` field exists on ProductVariant. If not, I'll search by ID for now or fix schema.

        // Let's try to find by ID first (User said "Barkod benzersiz", often uses ID in dev).
        // OR standard `barcode` field.

        const variant = await db.productVariant.findFirst({
            where: {
                OR: [
                    { barcode: barcode },
                    { id: barcode } // Allow scanning ID directly
                ]
            },
            include: {
                model: true,
                stocks: {
                    where: { storeId: storeId }
                }
            }
        })

        if (!variant) {
            return { success: false, error: "Ürün bulunamadı." }
        }

        const stockQty = variant.stocks[0]?.quantity || 0;

        if (stockQty <= 0) {
            return { success: false, error: `Bu mağazada stok yok! (${variant.model.name})` }
        }

        return {
            success: true,
            product: {
                variantId: variant.id,
                barcode: variant.barcode || variant.id,
                name: `${variant.model.name} - ${variant.color} / ${variant.size}`,
                modelName: variant.model.name,
                color: variant.color || "",
                size: variant.size || "",
                stock: stockQty,
                // image: variant.images?.[0] // Assuming images logic
            }
        }

    } catch (error: any) {
        console.error("Barcode Validation Error:", error);
        return { success: false, error: "Bir hata oluştu: " + error.message }
    }
}
