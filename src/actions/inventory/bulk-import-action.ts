"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { generateNextBarcodes } from "./barcode-actions";

interface ImportRow {
    "Model Adı"?: string;
    "Model Kodu"?: string; // Optional Model Code
    "Marka"?: string;
    "Kategori"?: string;
    "Sezon"?: string;
    "Renk"?: string;
    "Beden"?: string;
    "SKU"?: string;
    "Stok Kodu"?: string;
    "Barkod"?: string;
    "Alış Fiyatı"?: number | string;
    "Satış Fiyatı"?: number | string;
    [key: string]: any; // Allow dynamic store columns
}

export async function importProducts(rows: ImportRow[], stores: { id: string, name: string }[]) {
    try {
        if (!rows || rows.length === 0) {
            return { success: false, error: "İçe aktarılacak veri bulunamadı." }
        }

        const totalRows = rows.length;
        let emptyNameRows = 0;
        let validRows: ImportRow[] = [];

        // 1. Pre-filter and Diagnostics
        for (const row of rows) {
            if (!row["Model Adı"] || String(row["Model Adı"]).trim() === "") {
                emptyNameRows++;
                continue;
            }
            validRows.push(row);
        }

        // Grouping
        const modelGroups = new Map<string, ImportRow[]>();
        let missingBarcodeCount = 0;

        for (const row of validRows) {
            // Create a unique key for grouping
            const key = `${row["Model Adı"]}-${row["Marka"] || ""}-${row["Kategori"] || ""}`;

            if (!modelGroups.has(key)) modelGroups.set(key, []);
            modelGroups.get(key)!.push(row);

            if (!row["Barkod"] || String(row["Barkod"]).trim() === "") {
                missingBarcodeCount++;
            }
        }

        // Batch Generate Barcodes with Robust SystemCounter
        let generatedBarcodes: string[] = [];
        if (missingBarcodeCount > 0) {
            const res = await generateNextBarcodes(missingBarcodeCount);
            if (res.success && res.barcodes) {
                generatedBarcodes = res.barcodes;
            } else {
                // Determine if fatal or partial?
                // If it failed completely, we can't assign barcodes.
                throw new Error(res.error || "Sıralı barkod üretimi başarısız oldu.");
            }
        }

        let createdCount = 0;
        let updatedCount = 0;
        let usedBarcodeIndex = 0;
        let updatedItems: string[] = []; // Track names of updated items

        // 2. Process Each Model Group
        // Increase timeout for large batches
        await db.$transaction(async (tx) => {
            for (const [key, groupRows] of modelGroups) {
                const firstRow = groupRows[0];

                // Find or Create Model
                let model = await tx.productModel.findFirst({
                    where: {
                        name: firstRow["Model Adı"],
                        brand: firstRow["Marka"] || null
                    }
                });

                if (!model) {
                    model = await tx.productModel.create({
                        data: {
                            name: firstRow["Model Adı"] || "Bilinmeyen Model", // Safe fallback
                            brand: firstRow["Marka"] || null,
                            category: firstRow["Kategori"] || null,
                            season: firstRow["Sezon"] || null,
                            description: "Excel İçe Aktarım",
                            gender: "Erkek" // Default
                        }
                    });
                }

                // Process Variants for this Model
                for (const row of groupRows) {
                    const color = row["Renk"] || "-";
                    const size = row["Beden"] || "-";
                    // Improve Auto-SKU Generation to avoid collisions
                    // Old: matches first 3 chars (Bad for "Slim Fit Shirt" vs "Slim Fit Pant")
                    // New: Use simplified slugs OR Model Code if provided
                    const simpleSlug = (txt: string) => txt.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 6);

                    const modelCode = row["Model Kodu"];
                    const prefix = modelCode && String(modelCode).trim() !== ""
                        ? String(modelCode).trim().toUpperCase()
                        : simpleSlug(model.name);

                    const sku = row["SKU"] || row["Stok Kodu"] ||
                        `${prefix}-${simpleSlug(color)}-${size}`.toUpperCase();

                    let barcode = row["Barkod"];
                    // Assign from batch if missing
                    if (!barcode || String(barcode).trim() === "") {
                        if (usedBarcodeIndex < generatedBarcodes.length) {
                            barcode = generatedBarcodes[usedBarcodeIndex];
                            usedBarcodeIndex++;
                        } else {
                            // Should theoretically not happen if batch count matched
                            barcode = "ERR-" + Math.random().toString(36).substring(7);
                        }
                    }

                    // Check if variant exists
                    let variant = await tx.productVariant.findFirst({
                        where: {
                            OR: [
                                { barcode: String(barcode) },
                                { sku: String(sku) }
                            ]
                        }
                    });

                    if (variant) {
                        // Update
                        await tx.productVariant.update({
                            where: { id: variant.id },
                            data: {
                                purchasePrice: Number(row["Alış Fiyatı"]) || variant.purchasePrice,
                                salePrice: Number(row["Satış Fiyatı"]) || variant.salePrice,
                            }
                        });
                        updatedCount++;
                        if (updatedItems.length < 5) {
                            updatedItems.push(`${model.name} (${variant.sku})`);
                        }
                    } else {
                        // Create New Variant
                        variant = await tx.productVariant.create({
                            data: {
                                modelId: model.id,
                                color: color,
                                size: String(size),
                                sku: String(sku),
                                barcode: String(barcode),
                                purchasePrice: Number(row["Alış Fiyatı"]) || 0,
                                salePrice: Number(row["Satış Fiyatı"]) || 0,
                            }
                        });
                        createdCount++;
                    }

                    // Process Stocks (Dynamic Columns)
                    for (const store of stores) {
                        const quantity = Number(row[store.name]);
                        if (!isNaN(quantity)) {
                            const existingStock = await tx.stock.findUnique({
                                where: {
                                    variantId_storeId: {
                                        variantId: variant.id,
                                        storeId: store.id
                                    }
                                }
                            });

                            if (existingStock) {
                                await tx.stock.update({
                                    where: { id: existingStock.id },
                                    data: { quantity: quantity }
                                });
                            } else {
                                await tx.stock.create({
                                    data: {
                                        variantId: variant.id,
                                        storeId: store.id,
                                        quantity: quantity
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }, {
            maxWait: 20000,
            timeout: 60000
        });

        revalidatePath("/dashboard/products");

        // Detailed Message
        let msg = `✅ İşlem Tamamlandı!\n\n` +
            `📥 Toplam Gelen: ${totalRows}\n` +
            `✨ Yeni Eklenen: ${createdCount}\n` +
            `🔄 Güncellenen (Mükerrer/Mevcut): ${updatedCount}\n` +
            `🚫 Atlanan (İsmi Yok): ${emptyNameRows}`;

        if (updatedCount > 0 && updatedItems.length > 0) {
            msg += `\n\n📝 Örnek Mevcut Kayıtlar:\n- ${updatedItems.slice(0, 3).join("\n- ")}`;
            if (updatedItems.length > 3) msg += `\n... ve ${updatedItems.length - 3} diğer kayıt.`;
        }

        return {
            success: true,
            message: msg,
            diagnostics: {
                total: totalRows,
                valid: validRows.length,
                skipped: emptyNameRows
            }
        };

    } catch (error: any) {
        console.error("Bulk Import Error:", error);
        return { success: false, error: "İçe aktarım hatası: " + error.message };
    }
}
