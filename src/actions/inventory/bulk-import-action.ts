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
        const traceLogs: string[] = [];

        // Yardımcı: Normalizasyon (Küçük harf + Trim)
        const norm = (s?: string | number | null) => String(s ?? "").trim().toLowerCase();

        // ── 1. Ön Filtre ──────────────────────────────────────────────────
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const modelName = norm(row["Model Adı"]);
            if (!modelName) {
                emptyNameRows++;
                traceLogs.push(`⚠️ Satır ${i+1}: Model Adı boş, atlandı.`);
                continue;
            }
            validRows.push(row);
        }

        // ── 2. Modelleri Grupla (Kural: Model Kodu + Marka) ───────────────
        const modelGroups = new Map<string, ImportRow[]>();
        let missingBarcodeCount = 0;

        for (const row of validRows) {
            const mCode = norm(row["Model Kodu"] || row["Stok Kodu"] || row["Model Adı"]);
            const mBrand = norm(row["Marka"]);
            const key = `${mCode}||${mBrand}`; // Örn: "tyg-100||nike"

            if (!modelGroups.has(key)) modelGroups.set(key, []);
            modelGroups.get(key)!.push(row);

            if (!norm(row["Barkod"])) {
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
                throw new Error("Sıralı barkod üretimi başarısız oldu.");
            }
        }

        // ── 4. Modelleri Getir & Upsert ──────────────────────────────
        const neededCodes = Array.from(modelGroups.keys()).map(k => k.split("||")[0]);
        const existingModels = await db.productModel.findMany({
            where: { modelCode: { in: neededCodes } },
            select: { id: true, modelCode: true, brand: true }
        });

        const modelMap = new Map<string, string>();
        for (const m of existingModels) {
            modelMap.set(`${norm(m.modelCode)}||${norm(m.brand)}`, m.id);
        }

        let modelsCreated = 0;
        let modelsUpdated = 0;

        for (const [key, groupRows] of modelGroups) {
            const [mCode, mBrand] = key.split("||");
            const firstRow = groupRows[0];
            const existingId = modelMap.get(key);

            if (existingId) {
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
                const newModel = await db.productModel.create({
                    data: {
                        name: String(firstRow["Model Adı"]).trim(),
                        modelCode: mCode.toUpperCase(), // Kodları büyük saklayalım ama norm() ile küçük arayalım
                        brand: String(firstRow["Marka"] || "").trim() || null,
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
            origIndex: number;
        };
        const prepared: PreparedRow[] = [];

        for (const [key, groupRows] of modelGroups) {
            const modelId = modelMap.get(key);
            if (!modelId) continue;

            for (const row of groupRows) {
                const color = String(row["Renk"] || "-").trim();
                const size  = String(row["Beden"] || "-").trim();
                const rawSku = row["Stok Kodu"] || row["SKU"];
                
                const sku = rawSku ? String(rawSku).trim().toUpperCase() :
                    `${simpleSlug(key.split("||")[0])}-${simpleSlug(color)}-${size}`.toUpperCase();

                let barcode = norm(row["Barkod"]);
                if (!barcode) {
                    barcode = tempBarcodeIdx < generatedBarcodes.length
                        ? generatedBarcodes[tempBarcodeIdx++]
                        : "ERR-" + Math.random().toString(36).substring(7);
                }

                allBarcodes.push(barcode);
                allSkus.push(sku);
                prepared.push({ 
                    row, 
                    modelId, 
                    sku: sku.toUpperCase(), 
                    barcode: barcode.toLowerCase(), 
                    color, 
                    size,
                    origIndex: rows.indexOf(row) + 1
                });
            }
        }

        // ── 6. Mevcut Varyantları & Stokları Çek ─────────────────────────────
        const modelIds = Array.from(modelMap.values());
        const existingVariants = await db.productVariant.findMany({
            where: { modelId: { in: modelIds } },
            include: { stocks: true }
        });

        const existingBarcodeMap = new Map<string, typeof existingVariants[0]>();
        const existingSkuMap     = new Map<string, typeof existingVariants[0]>();
        const existingComboMap   = new Map<string, typeof existingVariants[0]>();

        for (const v of existingVariants) {
            if (v.barcode) existingBarcodeMap.set(norm(v.barcode), v);
            if (v.sku)     existingSkuMap.set(norm(v.sku), v);
            
            const comboKey = `${v.modelId}|${norm(v.color)}|${norm(v.size)}`;
            existingComboMap.set(comboKey, v);
        }

        // ── 7. Upsert Döngüsü ───────────────────────────────────────────────
        let variantsCreated = 0;
        let variantsUpdated = 0;
        let matchedByCombo = 0;
        let stocksIncremented = 0;

        for (const p of prepared) {
            let existing = existingBarcodeMap.get(norm(p.barcode)) || existingSkuMap.get(norm(p.sku));
            let matchType = "";

            if (!existing) {
                const comboKey = `${p.modelId}|${norm(p.color)}|${norm(p.size)}`;
                existing = existingComboMap.get(comboKey);
                if (existing) {
                    matchedByCombo++;
                    matchType = "Kombinasyon (Renk+Beden)";
                }
            } else {
                matchType = "Barkod/SKU";
            }

            if (existing) {
                await db.productVariant.update({
                    where: { id: existing.id },
                    data: {
                        purchasePrice: Number(p.row["Alış Fiyatı"]) || Number(existing.purchasePrice),
                        salePrice:     Number(p.row["Satış Fiyatı"]) || Number(existing.salePrice),
                    }
                });
                variantsUpdated++;
                traceLogs.push(`✅ [${p.origIndex}] ${p.sku}: ${matchType} ile bulundu, stoğu artırıldı.`);

                for (const store of stores) {
                    const incomingQty = Number(p.row[store.name]);
                    if (isNaN(incomingQty) || incomingQty <= 0) continue;

                    await db.stock.upsert({
                        where: { variantId_storeId: { variantId: existing.id, storeId: store.id } },
                        update: { quantity: { increment: incomingQty } },
                        create: { variantId: existing.id, storeId: store.id, quantity: incomingQty }
                    });
                    stocksIncremented++;
                }
            } else {
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
                traceLogs.push(`✨ [${p.origIndex}] ${p.sku}: Model kodu bulundu ama ${p.size} bedeni yoktu, yeni varyant açıldı.`);
            }
        }

        revalidatePath("/dashboard/products");

        const msg = `💎 Smart Import V3 Tamamlandı!\n\n` +
            `📂 Modeller: ${modelsCreated} Yeni, ${modelsUpdated} Güncellendi\n` +
            `🏷️ Varyantlar: ${variantsCreated} Yeni, ${matchedByCombo} Kombinasyon ile Eşleşti\n` +
            `🔄 Güncelleme: ${variantsUpdated} Varyant Fiyatı Senkronize Edildi\n` +
            `📦 Stoklar: ${stocksIncremented} Mağaza Stoğu Artırıldı\n\n` +
            `📝 Detaylı Log:\n` + traceLogs.slice(-20).join("\n") + (traceLogs.length > 20 ? "\n..." : "");

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
