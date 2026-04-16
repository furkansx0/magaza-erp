"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { generateNextBarcodes } from "./barcode-actions";

interface ImportRow {
    "Model Adı"?: string;
    "Marka"?: string;
    "Kategori 1"?: string;
    "Kategori 2"?: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// MİMARİ: "Önce hafızaya çek, sonra toplu yaz"
//
// Eski yaklaşım (yavaş):  N satır × 5 sorgu = 5N DB round-trip
// Yeni yaklaşım (hızlı):
//   1. findMany  → tüm mevcut modeller belleğe (1 sorgu)
//   2. findMany  → tüm mevcut varyantlar belleğe (1 sorgu)
//   3. create    → sadece eksik modeller (M sorgu, M << N)
//   4. createMany → tüm yeni varyantlar tek SQL (1 sorgu)
//   5. createMany → tüm stok kayıtları tek SQL  (1 sorgu)
//
// $transaction YOK → PgBouncer uyumlu, "Transaction already closed" yok.
// ─────────────────────────────────────────────────────────────────────────────

export async function importProducts(rows: ImportRow[], stores: { id: string, name: string }[]) {
    try {
        if (!rows || rows.length === 0) {
            return { success: false, error: "İçe aktarılacak veri bulunamadı." }
        }

        const totalRows = rows.length;
        let emptyNameRows = 0;
        const validRows: ImportRow[] = [];

        // ── 1. Ön Filtre (Model Adı + Model Kodu Kontrolü) ──────────────────
        for (const row of rows) {
            const modelName = String(row["Model Adı"] || "").trim();
            const modelCode = String(row["Model Kodu"] || row["Stok Kodu"] || "").trim();

            if (!modelName) {
                emptyNameRows++;
                continue;
            }
            validRows.push(row);
        }

        // ── 2. Modelleri Bellekte Grupla (Kural: Model Kodu + Marka) ────────
        // Eğer Model Kodu yoksa Model Adı'ndan türetilir
        const modelGroups = new Map<string, ImportRow[]>();
        let missingBarcodeCount = 0;

        for (const row of validRows) {
            const mCode = String(row["Model Kodu"] || row["Stok Kodu"] || "").trim() || String(row["Model Adı"]).trim();
            const mBrand = String(row["Marka"] || "").trim();
            const key = `${mCode}||${mBrand}`;

            if (!modelGroups.has(key)) modelGroups.set(key, []);
            modelGroups.get(key)!.push(row);

            if (!row["Barkod"] || String(row["Barkod"]).trim() === "") {
                missingBarcodeCount++;
            }
        }

        // ── 3. Barkod Rezervasyonu ──────────────────────────────────────────
        let generatedBarcodes: string[] = [];
        if (missingBarcodeCount > 0) {
            const res = await generateNextBarcodes(missingBarcodeCount);
            if (res.success && res.barcodes) {
                generatedBarcodes = res.barcodes;
            } else {
                throw new Error(res.error || "Sıralı barkod üretimi başarısız oldu.");
            }
        }

        // ── 4. Mevcut Modelleri Getir & Upsert ──────────────────────────────
        // modelCode + brand ikilisine göre ara
        const neededCodes = Array.from(modelGroups.keys()).map(k => k.split("||")[0]);
        const existingModels = await db.productModel.findMany({
            where: { modelCode: { in: neededCodes } },
            select: { id: true, modelCode: true, brand: true }
        });

        const modelMap = new Map<string, string>();
        for (const m of existingModels) {
            modelMap.set(`${m.modelCode}||${m.brand || ""}`, m.id);
        }

        let modelsCreated = 0;
        let modelsUpdated = 0;

        for (const [key, groupRows] of modelGroups) {
            const [mCode, mBrand] = key.split("||");
            const firstRow = groupRows[0];
            const existingId = modelMap.get(key);

            if (existingId) {
                // Mevcut modeli güncelle (Kategori, Sezon vb. değişmiş olabilir)
                await db.productModel.update({
                    where: { id: existingId },
                    data: {
                        name: String(firstRow["Model Adı"]).trim(),
                        category: firstRow["Kategori 1"] ? String(firstRow["Kategori 1"]).trim() : undefined,
                        subCategory: firstRow["Kategori 2"] ? String(firstRow["Kategori 2"]).trim() : undefined,
                        season: firstRow["Sezon"] ? String(firstRow["Sezon"]).trim() : undefined,
                    }
                });
                modelsUpdated++;
            } else {
                // Yeni model oluştur
                const newModel = await db.productModel.create({
                    data: {
                        name: String(firstRow["Model Adı"]).trim(),
                        modelCode: mCode,
                        brand: mBrand || null,
                        category: firstRow["Kategori 1"] ? String(firstRow["Kategori 1"]).trim() : null,
                        subCategory: firstRow["Kategori 2"] ? String(firstRow["Kategori 2"]).trim() : null,
                        season: firstRow["Sezon"] ? String(firstRow["Sezon"]).trim() : null,
                        description: "Excel İçe Aktarım",
                        gender: "Erkek"
                    }
                });
                modelMap.set(key, newModel.id);
                modelsCreated++;
            }
        }

        // ── 5. Varyant Hazırlığı ─────────────────────────────────────────────
        const allBarcodes: string[] = [];
        const allSkus: string[] = [];
        let tempBarcodeIdx = 0;

        const simpleSlug = (txt: string) =>
            txt.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 6);

        type PreparedRow = {
            row: ImportRow;
            modelId: string;
            sku: string;
            barcode: string;
            color: string;
            size: string;
        };
        const prepared: PreparedRow[] = [];

        for (const [key, groupRows] of modelGroups) {
            const modelId = modelMap.get(key);
            if (!modelId) continue;

            for (const row of groupRows) {
                const color = row["Renk"] ? String(row["Renk"]).trim() : "-";
                const size  = row["Beden"] ? String(row["Beden"]).trim() : "-";
                const rawSku = row["Stok Kodu"] || row["SKU"];
                
                const sku = rawSku ? String(rawSku).trim().toUpperCase() :
                    `${simpleSlug(key.split("||")[0])}-${simpleSlug(color)}-${size}`.toUpperCase();

                let barcode = row["Barkod"] ? String(row["Barkod"]).trim() : "";
                if (!barcode) {
                    barcode = tempBarcodeIdx < generatedBarcodes.length
                        ? generatedBarcodes[tempBarcodeIdx++]
                        : "ERR-" + Math.random().toString(36).substring(7);
                }

                allBarcodes.push(barcode);
                allSkus.push(sku);
                prepared.push({ row, modelId, sku, barcode, color, size });
            }
        }

        // ── 6. Mevcut Varyantları & Stokları Çek (Tüm Model Bazlı) ──────────
        // HATA ÖNLEME: Sadece Barkod/SKU değil, bu modellerin TÜM varyantlarını çekelim
        // Böylece kombinasyon (Model+Renk+Beden) kontrolü yapabiliriz.
        const modelIds = Array.from(modelMap.values());
        const existingVariants = await db.productVariant.findMany({
            where: { modelId: { in: modelIds } },
            include: { stocks: true }
        });

        // Eşleştirme Haritaları
        const existingBarcodeMap = new Map<string, typeof existingVariants[0]>();
        const existingSkuMap     = new Map<string, typeof existingVariants[0]>();
        const existingComboMap   = new Map<string, typeof existingVariants[0]>();

        for (const v of existingVariants) {
            if (v.barcode) existingBarcodeMap.set(v.barcode, v);
            if (v.sku)     existingSkuMap.set(v.sku, v);
            
            // Kombinasyon Anahtarı: ModelId | Renk | Beden
            const comboKey = `${v.modelId}|${String(v.color || "").trim()}|${String(v.size || "").trim()}`;
            existingComboMap.set(comboKey, v);
        }

        // ── 7. Upsert Döngüsü (Akıllı Eşleştirme) ───────────────────────────
        let variantsCreated = 0;
        let variantsUpdated = 0;
        let matchedByCombo = 0;
        let stocksIncremented = 0;

        for (const p of prepared) {
            // Eşleşme Hiyerarşisi: 1. Barkod, 2. SKU, 3. Kombinasyon
            let existing = existingBarcodeMap.get(p.barcode) || existingSkuMap.get(p.sku);
            
            if (!existing) {
                const comboKey = `${p.modelId}|${p.color}|${p.size}`;
                existing = existingComboMap.get(comboKey);
                if (existing) matchedByCombo++;
            }

            if (existing) {
                // 1. Fiyatları Güncelle (Sync)
                await db.productVariant.update({
                    where: { id: existing.id },
                    data: {
                        purchasePrice: Number(p.row["Alış Fiyatı"]) || Number(existing.purchasePrice),
                        salePrice:     Number(p.row["Satış Fiyatı"]) || Number(existing.salePrice),
                    }
                });
                variantsUpdated++;

                // 2. Stokları Üzerine Ekle (Increment)
                for (const store of stores) {
                    const incomingQty = Number(p.row[store.name]);
                    if (isNaN(incomingQty) || incomingQty <= 0) continue;

                    await db.stock.upsert({
                        where: {
                            variantId_storeId: {
                                variantId: existing.id,
                                storeId: store.id
                            }
                        },
                        update: { quantity: { increment: incomingQty } },
                        create: {
                            variantId: existing.id,
                            storeId: store.id,
                            quantity: incomingQty
                        }
                    });
                    stocksIncremented++;
                }
            } else {
                // Yeni Varyant Oluştur
                await db.productVariant.create({
                    data: {
                        modelId:       p.modelId,
                        color:         p.color,
                        size:          p.size,
                        sku:           p.sku,
                        barcode:       p.barcode,
                        purchasePrice: Number(p.row["Alış Fiyatı"]) || 0,
                        salePrice:     Number(p.row["Satış Fiyatı"]) || 0,
                        stocks: {
                            create: stores.map(s => {
                                const qty = Number(p.row[s.name]);
                                return (!isNaN(qty) && qty > 0) ? { storeId: s.id, quantity: qty } : null;
                            }).filter(Boolean) as any
                        }
                    }
                });
                variantsCreated++;
            }
        }

        revalidatePath("/dashboard/products");

        const msg = `💎 Sistem Pırlanta Gibi Oldu!\n\n` +
            `📂 Modeller: ${modelsCreated} Yeni, ${modelsUpdated} Güncellendi\n` +
            `🏷️ Varyantlar: ${variantsCreated} Yeni, ${matchedByCombo} Kombinasyon ile Eşleşti\n` +
            `🔄 Güncelleme: ${variantsUpdated} Varyant Fiyatı Senkronize Edildi\n` +
            `📦 Stoklar: ${stocksIncremented} Mağaza Stoğu Artırıldı\n` +
            `🚫 Hatalı Satırlar: ${emptyNameRows}`;

        return {
            success: true,
            message: msg,
            newVariants: [],
            diagnostics: { total: totalRows, valid: validRows.length, skipped: emptyNameRows }
        };

    } catch (error: any) {
        console.error("Smart Import Error:", error);
        return { success: false, error: "İçe aktarım hatası: " + error.message }
    }
}
