"use server"

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

type BulkPriceOperation = {
    type: "PERCENTAGE_INCREASE" | "PERCENTAGE_DECREASE" | "SET_FIXED_PRICE";
    value: number;
}

export async function bulkUpdatePrice(variantIds: string[], operation: BulkPriceOperation) {
    try {
        if (variantIds.length === 0) return { success: false, error: "Ürün seçilmedi." };

        if (operation.type === "SET_FIXED_PRICE") {
            // Tek atomik SQL — $transaction gerektirmez, PgBouncer uyumlu
            await db.productVariant.updateMany({
                where: { id: { in: variantIds } },
                data: { salePrice: operation.value }
            });
        } else {
            // Yüzde hesabı için mevcut fiyatları oku, sonra updateMany
            // Tüm varyantları TEK sorguda çek
            const variants = await db.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: { id: true, salePrice: true }
            });

            // Her varyant için hesapla, promise array'e ekle
            // Promise.all ile paralel gönder (bağımsız UPDATE'ler, $transaction yok)
            const PARALLEL_BATCH = 50; // Neon'u bunaltmamak için
            for (let i = 0; i < variants.length; i += PARALLEL_BATCH) {
                const batch = variants.slice(i, i + PARALLEL_BATCH);
                await Promise.all(batch.map(variant => {
                    const current  = Number(variant.salePrice);
                    const newPrice = operation.type === "PERCENTAGE_INCREASE"
                        ? current * (1 + operation.value / 100)
                        : current * (1 - operation.value / 100);
                    return db.productVariant.update({
                        where: { id: variant.id },
                        data:  { salePrice: Math.round(newPrice * 100) / 100 }
                    });
                }));
            }
        }

        revalidatePath("/dashboard/products");
        return { success: true, message: `${variantIds.length} ürünün fiyatı güncellendi.` };

    } catch (error) {
        console.error("Bulk Price Update Error:", error);
        return { success: false, error: "Toplu güncelleme başarısız." };
    }
}

export async function bulkArchive(variantIds: string[]) {
    try {
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
    }
}

export async function bulkDelete(variantIds: string[]) {
    try {
        let deletedCount  = 0;
        let skippedCount  = 0;

        // Tüm kontrolleri $transaction OLMADAN yap — PgBouncer uyumlu
        // Adım 1: Satış geçmişi kontrolü (tek sorguda _count ile)
        const variantsToCheck = await db.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
                id: true,
                _count: { select: { saleItems: true, stockMovements: true, stockTransferItems: true } }
            }
        });

        const idsToDelete: string[] = [];

        for (const v of variantsToCheck) {
            // Satış, stok hareketi veya transfer geçmişi varsa atla
            if (v._count.saleItems > 0 || v._count.stockMovements > 0 || v._count.stockTransferItems > 0) {
                skippedCount++;
            } else {
                idsToDelete.push(v.id);
            }
        }

        // Adım 2: Güvenli olanları tek sorguda sil
        if (idsToDelete.length > 0) {
            const res = await db.productVariant.deleteMany({
                where: { id: { in: idsToDelete } }
            });
            deletedCount = res.count;
        }

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
