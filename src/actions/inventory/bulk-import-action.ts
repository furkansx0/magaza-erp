"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { generateNextBarcodes } from "./barcode-actions";

export interface SmartImportRow {
    gender: string;
    season: string;
    category: string;
    subCategory: string;
    modelCode: string;
    modelName: string;
    brand?: string;
    color: string;
    size: string;
    barcode?: string;
    purchasePrice: number;
    salePrice: number;
    operationType: "EKLE" | "GÜNCELLE";
    stocks: Record<string, number>; // storeName -> quantity
}

export interface ImportReport {
    success: boolean;
    summary: {
        totalRows: number;
        modelsCreated: number;
        variantsCreated: number;
        stocksUpdated: number;
        failedRows: number;
    };
    logs: { type: "info" | "success" | "warning" | "error"; message: string }[];
}

/**
 * Smart Retail Engine V4 - Bulk Import Action
 */
export async function runSmartImport(rows: SmartImportRow[], stores: { id: string, name: string }[]): Promise<ImportReport> {
    const report: ImportReport = {
        success: true,
        summary: { totalRows: rows.length, modelsCreated: 0, variantsCreated: 0, stocksUpdated: 0, failedRows: 0 },
        logs: []
    };

    if (rows.length === 0) {
        return { ...report, success: false, logs: [{ type: "error", message: "İçe aktarılacak veri bulunamadı." }] };
    }

    try {
        // 1. Pre-process Barcodes (Reserve ranges for missing ones)
        const missingBarcodeRows = rows.filter(r => !r.barcode || r.barcode.trim() === "");
        let generatedBarcodes: string[] = [];
        if (missingBarcodeRows.length > 0) {
            const res = await generateNextBarcodes(missingBarcodeRows.length);
            if (res.success && res.barcodes) {
                generatedBarcodes = res.barcodes;
            } else {
                throw new Error("Sıralı barkod üretimi başarısız oldu.");
            }
        }

        let barcodeIdx = 0;
        const normalizedRows = rows.map(r => {
            const barcode = (r.barcode && r.barcode.trim() !== "") 
                ? r.barcode.trim() 
                : generatedBarcodes[barcodeIdx++];
            
            return {
                ...r,
                modelCode: r.modelCode.trim().toUpperCase(),
                barcode: barcode.trim()
            };
        });

        // 2. Transactional Process
        await db.$transaction(async (tx) => {
            // Group by Model Code to minimize lookups
            const modelGroups = new Map<string, typeof normalizedRows>();
            for (const r of normalizedRows) {
                if (!modelGroups.has(r.modelCode)) modelGroups.set(r.modelCode, []);
                modelGroups.get(r.modelCode)!.push(r);
            }

            for (const [mCode, mRows] of modelGroups) {
                const first = mRows[0];
                
                // A. Model Upsert
                const model = await tx.productModel.upsert({
                    where: { modelCode: mCode },
                    create: {
                        modelCode: mCode,
                        name: first.modelName,
                        brand: first.brand || "Genel",
                        gender: first.gender,
                        season: first.season,
                        category: first.category,
                        subCategory: first.subCategory,
                        description: "Smart Engine Import",
                    },
                    update: {
                        name: first.modelName,
                        gender: first.gender,
                        season: first.season,
                        category: first.category,
                        subCategory: first.subCategory,
                    }
                });

                if (model.createdAt === model.updatedAt) report.summary.modelsCreated++;

                // B. Variants & Stocks
                for (const r of mRows) {
                    try {
                        // Variant Upsert
                        const variant = await tx.productVariant.upsert({
                            where: { barcode: r.barcode },
                            create: {
                                modelId: model.id,
                                barcode: r.barcode,
                                color: r.color,
                                size: r.size,
                                purchasePrice: r.purchasePrice,
                                salePrice: r.salePrice,
                                sku: `${mCode}-${r.color}-${r.size}`.toUpperCase()
                            },
                            update: {
                                purchasePrice: r.purchasePrice,
                                salePrice: r.salePrice,
                                color: r.color,
                                size: r.size,
                            }
                        });

                        if (variant.createdAt === variant.updatedAt) report.summary.variantsCreated++;

                        // Stock Logic (EKLE vs GÜNCELLE)
                        for (const store of stores) {
                            const qty = r.stocks[store.name] || 0;
                            
                            if (r.operationType === "EKLE") {
                                await tx.stock.upsert({
                                    where: { variantId_storeId: { variantId: variant.id, storeId: store.id } },
                                    create: { variantId: variant.id, storeId: store.id, quantity: qty },
                                    update: { quantity: { increment: qty } }
                                });
                            } else {
                                // GÜNCELLE (Overwrite)
                                await tx.stock.upsert({
                                    where: { variantId_storeId: { variantId: variant.id, storeId: store.id } },
                                    create: { variantId: variant.id, storeId: store.id, quantity: qty },
                                    update: { quantity: qty }
                                });
                            }
                        }
                        report.summary.stocksUpdated++;

                    } catch (rowErr: any) {
                        report.summary.failedRows++;
                        report.logs.push({ type: "error", message: `Satır Hatası (${r.barcode || r.modelCode}): ${rowErr.message}` });
                    }
                }
            }
        }, {
            timeout: 60000, // 1 minute for large imports
            maxWait: 15000
        });

        report.logs.push({ type: "success", message: "İşlem başarıyla tamamlandı." });
        revalidatePath("/dashboard/products");
        return report;

    } catch (err: any) {
        console.error("Smart Import Global Error:", err);
        return {
            ...report,
            success: false,
            logs: [{ type: "error", message: `Global Hata: ${err.message}` }]
        };
    }
}
