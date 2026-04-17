"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { generateNextBarcodes } from "./barcode-actions";

export interface SmartImportRow {
    gender: string;
    brand?: string;
    seasonType: string; // Mevsim (Yazlık, Kışlık, 4 Mevsim)
    seasonYear: string; // Sezon (2024 Yaz, 2025 Kış vb.)
    category: string;   // Ana Kategori
    subCategory: string; // Alt Kategori
    modelCode: string;
    color: string;
    size: string;
    barcode?: string;
    sku?: string;
    purchasePrice: number;
    salePrice: number;
    operationType: "EKLE" | "GÜNCELLE";
    stocks: Record<string, string | number>; // storeName -> quantity (string for "+/-" logic)
}

export interface ImportReport {
    success: boolean;
    summary: {
        totalRows: number;
        modelsCreated: number;
        colorsCreated: number;
        variantsCreated: number;
        stocksUpdated: number;
        failedRows: number;
    };
    logs: { type: "info" | "success" | "warning" | "error"; message: string }[];
}

/**
 * Smart Retail Engine V5 - Bulk Import Action (Professional Hierarchy)
 */
export async function runSmartImport(rows: SmartImportRow[], stores: { id: string, name: string }[]): Promise<ImportReport> {
    const report: ImportReport = {
        success: true,
        summary: { totalRows: rows.length, modelsCreated: 0, colorsCreated: 0, variantsCreated: 0, stocksUpdated: 0, failedRows: 0 },
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
                throw new Error("Barkod üretimi başarısız: " + (res.error || "Bilinmeyen hata"));
            }
        }

        let barcodeIdx = 0;
        const normalizedRows = rows.map(r => {
            const barcode = (r.barcode && r.barcode.trim() !== "") 
                ? r.barcode.trim() 
                : generatedBarcodes[barcodeIdx++];
            
            // Auto-generate SKU if missing
            const sku = (r.sku && r.sku.trim() !== "")
                ? r.sku.trim()
                : `${r.modelCode}-${r.color}-${r.size}`.toUpperCase();
            
            return {
                ...r,
                modelCode: r.modelCode.trim().toUpperCase(),
                barcode: barcode.trim(),
                sku: sku.trim()
            };
        });

        // 2. Transactional Process
        await db.$transaction(async (tx) => {
            // Group by Model Code
            const modelGroups = new Map<string, typeof normalizedRows>();
            for (const r of normalizedRows) {
                if (!modelGroups.has(r.modelCode)) modelGroups.set(r.modelCode, []);
                modelGroups.get(r.modelCode)!.push(r);
            }

            for (const [mCode, mRows] of modelGroups) {
                const first = mRows[0];
                
                // A. Level 1: Model Upsert
                const model = await tx.productModel.upsert({
                    where: { modelCode: mCode },
                    create: {
                        modelCode: mCode,
                        name: mCode,
                        brand: first.brand || "Genel",
                        gender: first.gender,
                        seasonYear: first.seasonYear,
                        seasonType: first.seasonType,
                        category: first.category,
                        subCategory: first.subCategory,
                        description: "Smart Engine Import V5",
                    },
                    update: {
                        brand: first.brand || "Genel",
                        gender: first.gender,
                        seasonYear: first.seasonYear,
                        seasonType: first.seasonType,
                        category: first.category,
                        subCategory: first.subCategory,
                    }
                });

                if (model.createdAt.getTime() === model.updatedAt.getTime()) report.summary.modelsCreated++;

                // Group by Color within Model
                const colorGroups = new Map<string, typeof mRows>();
                for (const r of mRows) {
                    const cKey = r.color.trim().toUpperCase();
                    if (!colorGroups.has(cKey)) colorGroups.set(cKey, []);
                    colorGroups.get(cKey)!.push(r);
                }

                for (const [colorName, cRows] of colorGroups) {
                    // B. Level 2: Color Upsert
                    const productColor = await tx.productColor.upsert({
                        where: { modelId_name: { modelId: model.id, name: colorName } },
                        create: { modelId: model.id, name: colorName },
                        update: {} // No metadata at color level yet
                    });

                    if (productColor.createdAt.getTime() === productColor.updatedAt.getTime()) report.summary.colorsCreated++;

                    // C. Level 3: Variants & Stocks
                    for (const r of cRows) {
                        try {
                            const variant = await tx.productVariant.upsert({
                                where: { barcode: r.barcode },
                                create: {
                                    colorId: productColor.id,
                                    barcode: r.barcode,
                                    size: r.size,
                                    purchasePrice: r.purchasePrice,
                                    salePrice: r.salePrice,
                                    sku: r.sku
                                },
                                update: {
                                    purchasePrice: r.purchasePrice,
                                    salePrice: r.salePrice,
                                    size: r.size,
                                    sku: r.sku
                                }
                            });

                            if (variant.createdAt.getTime() === variant.updatedAt.getTime()) report.summary.variantsCreated++;

                            // Stock Logic
                            for (const store of stores) {
                                const rawVal = r.stocks[store.name];
                                const isString = typeof rawVal === "string";
                                const strVal = String(rawVal || "0").trim();
                                const isIncrement = isString && (strVal.startsWith("+") || strVal.startsWith("-"));
                                const qty = Number(rawVal) || 0;
                                
                                if (isIncrement || r.operationType === "EKLE") {
                                    await tx.stock.upsert({
                                        where: { variantId_storeId: { variantId: variant.id, storeId: store.id } },
                                        create: { variantId: variant.id, storeId: store.id, quantity: qty },
                                        update: { quantity: { increment: qty } }
                                    });
                                } else {
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
            }
        }, {
            timeout: 60000,
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
