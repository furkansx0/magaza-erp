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

// PgBouncer transaction-mode ile interactive $transaction kullanılamaz.
// Çözüm: transaction wrapper kaldırıldı, her operasyon doğrudan db.* ile yapılır.
// Atomicity → upsert + findFirst kombinasyonu ile satır bazında sağlanır.
// Bir satır hata verse bile diğerleri etkilenmez (bulk import için doğru davranış).

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

        // 2. Model bazlı gruplama
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

        // 3. Tüm barkodları önceden rezerve et (tek atomik sayaç artırımı)
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
        let errorCount = 0;
        let usedBarcodeIndex = 0;
        let newlyCreatedVariants: any[] = [];

        const simpleSlug = (txt: string) =>
            txt.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 6);

        // 4. Her model grubunu sırayla işle — transaction YOK, PgBouncer uyumlu
        for (const [, groupRows] of modelGroups) {
            const firstRow = groupRows[0];

            // Model: findFirst + create (PgBouncer uyumlu, transaction gerektirmez)
            let model = await db.productModel.findFirst({
                where: {
                    name: firstRow["Model Adı"],
                    brand: firstRow["Marka"] || null
                }
            });

            if (!model) {
                model = await db.productModel.create({
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

            // 5. Her varyantı sırayla işle
            for (const row of groupRows) {
                try {
                    const color = row["Renk"] || "-";
                    const size  = row["Beden"] || "-";
                    const sku   = row["Stok Kodu"] || row["SKU"] ||
                        `${simpleSlug(model.name)}-${simpleSlug(color)}-${size}`.toUpperCase();

                    let barcode = row["Barkod"];
                    if (!barcode || String(barcode).trim() === "") {
                        barcode = usedBarcodeIndex < generatedBarcodes.length
                            ? generatedBarcodes[usedBarcodeIndex++]
                            : "ERR-" + Math.random().toString(36).substring(7);
                    }

                    // Varyantı bul
                    const existingVariant = await db.productVariant.findFirst({
                        where: {
                            OR: [
                                { barcode: String(barcode) },
                                { sku: String(sku) }
                            ]
                        }
                    });

                    let variant;
                    if (existingVariant) {
                        // Güncelle
                        variant = await db.productVariant.update({
                            where: { id: existingVariant.id },
                            data: {
                                purchasePrice: Number(row["Alış Fiyatı"]) || existingVariant.purchasePrice,
                                salePrice:     Number(row["Satış Fiyatı"]) || existingVariant.salePrice,
                            }
                        });
                        updatedCount++;
                    } else {
                        // Oluştur
                        variant = await db.productVariant.create({
                            data: {
                                modelId:       model.id,
                                color,
                                size:          String(size),
                                sku:           String(sku),
                                barcode:       String(barcode),
                                purchasePrice: Number(row["Alış Fiyatı"]) || 0,
                                salePrice:     Number(row["Satış Fiyatı"]) || 0,
                            }
                        });
                        createdCount++;
                    }

                    // 6. Stok: upsert ile — transaction gerektirmez, atomic
                    let totalStock = 0;
                    for (const store of stores) {
                        const quantity = Number(row[store.name]);
                        if (!isNaN(quantity) && quantity >= 0) {
                            totalStock += quantity;
                            await db.stock.upsert({
                                where: {
                                    variantId_storeId: {
                                        variantId: variant.id,
                                        storeId:   store.id
                                    }
                                },
                                update: { quantity },
                                create: {
                                    variantId: variant.id,
                                    storeId:   store.id,
                                    quantity
                                }
                            });
                        }
                    }

                    if (!existingVariant) {
                        newlyCreatedVariants.push({
                            ...variant,
                            season:     model.season,
                            totalStock
                        });
                    }

                } catch (rowError: any) {
                    // Satır hatası tüm import'u durdurmasın
                    console.error("Row import error:", rowError?.message);
                    errorCount++;
                }
            }
        }

        revalidatePath("/dashboard/products");

        const msg = `✅ İşlem Tamamlandı!\n\n` +
            `📥 Toplam Gelen: ${totalRows}\n` +
            `✨ Yeni Eklenen: ${createdCount}\n` +
            `🔄 Güncellenen: ${updatedCount}\n` +
            `❌ Hatalı Satır: ${errorCount}\n` +
            `🚫 Atlanan (İsmi Yok): ${emptyNameRows}`;

        return {
            success: true,
            message: msg,
            newVariants: newlyCreatedVariants,
            diagnostics: { total: totalRows, valid: validRows.length, skipped: emptyNameRows, errors: errorCount }
        };

    } catch (error: any) {
        console.error("Bulk Import Error:", error);
        return { success: false, error: "İçe aktarım hatası: " + error.message }
    }
}
