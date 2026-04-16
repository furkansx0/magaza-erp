"use server"

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const StockAdjustmentSchema = z.object({
    variantId: z.string(),
    storeId: z.string(),
    quantity: z.number().min(1, "En az 1 adet eklemelisiniz."),
    type: z.enum(["ADD", "REMOVE"]).default("ADD"),
    reason: z.string().optional()
});

export async function adjustStock(data: z.infer<typeof StockAdjustmentSchema>) {
    try {
        const { variantId, storeId, quantity, type, reason } = StockAdjustmentSchema.parse(data);

        // Find existing stock record
        const existingStock = await db.stock.findUnique({
            where: {
                variantId_storeId: {
                    variantId,
                    storeId
                }
            }
        });

        const currentQty = existingStock?.quantity || 0;
        const newQty = type === "ADD" ? currentQty + quantity : currentQty - quantity;

        if (newQty < 0) {
            return { success: false, message: "Stok negatif olamaz." };
        }

        // Upsert Stock
        await db.stock.upsert({
            where: {
                variantId_storeId: {
                    variantId,
                    storeId
                }
            },
            update: {
                quantity: newQty
            },
            create: {
                variantId,
                storeId,
                quantity: newQty
            }
        });

        // Optional: Create StockMovement Log here (Future phase)

        revalidatePath("/dashboard/products");
        return { success: true, message: `Stok güncellendi: ${type === "ADD" ? '+' : '-'}${quantity}` };

    } catch (error: unknown) {
        console.error("Stock adjustment error:", error);
        let message = "İşlem başarısız.";
        if (error instanceof Error) {
            message = error.message;
        }
        return { success: false, message };
    }
}

interface StockResult {
    storeName: string;
    stock: number;
}

interface ProductStockInfo {
    variantId: string;
    productName: string;
    description: string;
    barcode: string;
    stocks: StockResult[];
}

export async function checkGlobalStock(query: string): Promise<{ success: boolean, results?: ProductStockInfo[], error?: string }> {
    if (!query || query.length < 2) {
        return { success: false, error: "Lütfen en az 2 karakter giriniz." }
    }

    try {
        const variants = await db.productVariant.findMany({
            where: {
                OR: [
                    { barcode: { contains: query } },
                    { sku: { contains: query } }, // Added Variant SKU
                    {
                        color: {
                            model: {
                                OR: [
                                    { name: { contains: query } },
                                    { modelCode: { contains: query } } // Added Model Code
                                ]
                            }
                        }
                    }
                ]
            },
            include: {
                color: {
                    include: { model: true }
                },
                stocks: {
                    include: {
                        store: true
                    }
                }
            },
            take: 20 // Increased limit
        })

        if (variants.length === 0) {
            return { success: true, results: [] }
        }

        const results: ProductStockInfo[] = variants.map(v => ({
            variantId: v.id,
            productName: v.color.model.name,
            description: `${v.size} - ${v.color.name}`,
            barcode: v.barcode,
            stocks: v.stocks.map(s => ({
                storeName: s.store.name,
                stock: s.quantity
            }))
        }))

        return { success: true, results }

    } catch (error) {
        console.error("Global stock check error:", error)
        return { success: false, error: "Stok sorgulanırken hata oluştu" }
    }
}
