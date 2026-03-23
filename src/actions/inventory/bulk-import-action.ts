"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { generateNextBarcodes } from "./barcode-actions";

interface ImportRow {
    "Model Adı"?: string;
    "Marka"?: string;
    "Kategori"?: string;
    "Sezon"?: string;
    "Renk"?: string;
    "Beden"?: string;
    "Stok Kodu"?: string;
    "SKU"?: string;
    "Barkod"?: string;
    "Alış Fiyatı"?: number | string;
    "Satış Fiyatı"?: number | string;
    [key: string]: any;
}

const CHUNK_SIZE = 500; // Her pakette max 500 satır

export async function importProducts(rows: ImportRow[], stores: { id: string, name: string }[]) {
    try {
        if (!rows || rows.length === 0) {
            return { success: false, error: "İçe aktarılacak veri bulunamadı." }
        }

        const totalRows = rows.length;
        let emptyNameRows = 0;
        let validRows: ImportRow[] = [];

        // 1. Pre-filter
        for (const row of rows) {
            if (!row["Model Adı"] || String(row["Model Adı"]).trim() === "") {
                emptyNameRows++;
                continue;
            }
            validRows.push(row);
        }

        // 2. Grouping by Model
        const modelGroups = new Map<string, ImportRow[]>();
        let missingBarcodeCount = 0;

        for (const row of validRows) {
            const key = `${row["Model Adı"]}-${row["Marka"] || ""}-${row["Kategori"] || ""}`;
            if (!modelGroups.has(key)) modelGroups.set(key, []);
            modelGroups.get(key)!.push(row);
            if (!row["Barkod"] || String(row["Barkod"]).trim() === "") {
                missingBarcodeCount++;
            }
        }

        // 3. Batch Generate Barcodes up front (single atomic counter increment)
        let generatedBarcodes: string[] = [];
        if (missingBarcodeCount > 0) {
            const res = await generateNextBarcodes(missingBarcodeCount);
            if (res.success && res.barcodes) {
                generatedBarcodes = res.barcodes;
            } else {
                throw new Error(res.error || "Sıralı barkod üretimi başarısız oldu.");
            }
        }

        let createdCount = 0;
        let updatedCount = 0;
        let usedBarcodeIndex = 0;
        let updatedItems: string[] = [];
        let newlyCreatedVariants: any[] = [];

        // 4. Split model groups into chunks of CHUNK_SIZE rows
        const allEntries = Array.from(modelGroups.entries());

        // Build chunk boundaries: each chunk holds groups until cumulative row count >= CHUNK_SIZE
        const chunks: Array<[string, ImportRow[]][]> = [];
        let currentChunk: [string, ImportRow[]][] = [];
        let currentChunkRows = 0;

        for (const entry of allEntries) {
            currentChunk.push(entry);
            currentChunkRows += entry[1].length;

            if (currentChunkRows >= CHUNK_SIZE) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentChunkRows = 0;
            }
        }
        if (currentChunk.length > 0) chunks.push(currentChunk);

        // 5. Process each chunk in its own transaction (prevents Vercel/Neon timeout)
        for (const chunk of chunks) {
            await db.$transaction(async (tx) => {
                for (const [, groupRows] of chunk) {
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
                                name: firstRow["Model Adı"] || "Bilinmeyen Model",
                                brand: firstRow["Marka"] || null,
                                category: firstRow["Kategori"] || null,
                                season: firstRow["Sezon"] || null,
                                description: "Excel İçe Aktarım",
                                gender: "Erkek"
                            }
                        });
                    }

                    // Process Variants
                    for (const row of groupRows) {
                        const color = row["Renk"] || "-";
                        const size = row["Beden"] || "-";
                        const simpleSlug = (txt: string) => txt.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 6);
                        const sku = row["Stok Kodu"] || row["SKU"] ||
                            `${simpleSlug(model.name)}-${simpleSlug(color)}-${size}`.toUpperCase();

                        let barcode = row["Barkod"];
                        if (!barcode || String(barcode).trim() === "") {
                            if (usedBarcodeIndex < generatedBarcodes.length) {
                                barcode = generatedBarcodes[usedBarcodeIndex];
                                usedBarcodeIndex++;
                            } else {
                                barcode = "ERR-" + Math.random().toString(36).substring(7);
                            }
                        }

                        let variant = await tx.productVariant.findFirst({
                            where: {
                                OR: [
                                    { barcode: String(barcode) },
                                    { sku: String(sku) }
                                ]
                            }
                        });

                        if (variant) {
                            await tx.productVariant.update({
                                where: { id: variant.id },
                                data: {
                                    purchasePrice: Number(row["Alış Fiyatı"]) || variant.purchasePrice,
                                    salePrice: Number(row["Satış Fiyatı"]) || variant.salePrice,
                                }
                            });
                            updatedCount++;
                            if (updatedItems.length < 5) {
                                updatedItems.push(`${model.name} (${sku})`);
                            }
                        } else {
                            variant = await tx.productVariant.create({
                                data: {
                                    modelId: model.id,
                                    color,
                                    size: String(size),
                                    sku: String(sku),
                                    barcode: String(barcode),
                                    purchasePrice: Number(row["Alış Fiyatı"]) || 0,
                                    salePrice: Number(row["Satış Fiyatı"]) || 0,
                                }
                            });
                            createdCount++;
                            let newVariantTotalStock = 0;

                            for (const store of stores) {
                                const quantity = Number(row[store.name]);
                                if (!isNaN(quantity) && quantity > 0) {
                                    newVariantTotalStock += quantity;
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
                                            data: { quantity }
                                        });
                                    } else {
                                        await tx.stock.create({
                                            data: {
                                                variantId: variant.id,
                                                storeId: store.id,
                                                quantity
                                            }
                                        });
                                    }
                                }
                            }

                            newlyCreatedVariants.push({
                                ...variant,
                                season: model.season,
                                totalStock: newVariantTotalStock
                            });
                        }
                    }
                }
            }, {
                maxWait: 10000,   // Her chunk için 10s bekleme
                timeout: 30000    // Her chunk için 30s limit (Vercel safe)
            });
        }

        revalidatePath("/dashboard/products");

        const msg = `✅ İşlem Tamamlandı!\n\n` +
            `📦 Paket Sayısı: ${chunks.length}\n` +
            `📥 Toplam Gelen: ${totalRows}\n` +
            `✨ Yeni Eklenen: ${createdCount}\n` +
            `🔄 Güncellenen: ${updatedCount}\n` +
            `🚫 Atlanan (İsmi Yok): ${emptyNameRows}`;

        return {
            success: true,
            message: msg,
            newVariants: newlyCreatedVariants,
            diagnostics: { total: totalRows, valid: validRows.length, skipped: emptyNameRows }
        };

    } catch (error: any) {
        console.error("Bulk Import Error:", error);
        return { success: false, error: "İçe aktarım hatası: " + error.message }
    }
}
