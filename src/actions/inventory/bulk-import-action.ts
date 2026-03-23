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

        // ── 1. Ön Filtre ────────────────────────────────────────────────────
        for (const row of rows) {
            if (!row["Model Adı"] || String(row["Model Adı"]).trim() === "") {
                emptyNameRows++;
                continue;
            }
            validRows.push(row);
        }

        // ── 2. Modelleri Bellekte Grupla ────────────────────────────────────
        const modelGroups = new Map<string, ImportRow[]>();
        let missingBarcodeCount = 0;

        for (const row of validRows) {
            const key = `${row["Model Adı"]}||${row["Marka"] || ""}||${row["Kategori"] || ""}`;
            if (!modelGroups.has(key)) modelGroups.set(key, []);
            modelGroups.get(key)!.push(row);
            if (!row["Barkod"] || String(row["Barkod"]).trim() === "") {
                missingBarcodeCount++;
            }
        }

        // ── 3. Tüm Barkodları Önceden Rezerve Et (tek atomik işlem) ─────────
        let generatedBarcodes: string[] = [];
        if (missingBarcodeCount > 0) {
            const res = await generateNextBarcodes(missingBarcodeCount);
            if (res.success && res.barcodes) {
                generatedBarcodes = res.barcodes;
            } else {
                throw new Error(res.error || "Sıralı barkod üretimi başarısız oldu.");
            }
        }

        // ── 4. Mevcut Modelleri TEK SORGUDA Belleğe Çek ─────────────────────
        // Sorgulayacağımız model adlarını topla
        const neededModelNames = Array.from(modelGroups.keys()).map(k => k.split("||")[0]);
        const existingModels = await db.productModel.findMany({
            where: { name: { in: neededModelNames } },
            select: { id: true, name: true, brand: true }
        });
        // name||brand → id
        const modelMap = new Map<string, string>();
        for (const m of existingModels) {
            modelMap.set(`${m.name}||${m.brand || ""}`, m.id);
        }

        // ── 5. Eksik Modelleri Oluştur ───────────────────────────────────────
        // (createMany modelde id dönmediği için tek tek create yapıyoruz — ama sadece eksikler)
        for (const [key, groupRows] of modelGroups) {
            if (modelMap.has(key.replace(/\|\|[^|]*$/, "") + "||" + (key.split("||")[1] || ""))) continue;
            const firstRow = groupRows[0];
            const lookupKey = `${firstRow["Model Adı"]}||${firstRow["Marka"] || ""}`;
            if (modelMap.has(lookupKey)) continue; // başka gruptan zaten oluşturulmuş

            const newModel = await db.productModel.create({
                data: {
                    name: firstRow["Model Adı"] || "Bilinmeyen Model",
                    brand: firstRow["Marka"] || null,
                    category: firstRow["Kategori"] || null,
                    season: firstRow["Sezon"] || null,
                    description: "Excel İçe Aktarım",
                    gender: "Erkek"
                }
            });
            modelMap.set(lookupKey, newModel.id);
        }

        // ── 6. Mevcut Varyantları TEK SORGUDA Belleğe Çek ───────────────────
        // Tüm barkod ve SKU'ları topla
        const allBarcodes: string[] = [];
        const allSkus: string[] = [];
        let tempBarcodeIdx = 0;

        const simpleSlug = (txt: string) =>
            txt.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 6);

        // Önce tüm satırların barcode/sku değerlerini hesapla
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
            const parts = key.split("||");
            const lookupKey = `${parts[0]}||${parts[1] || ""}`;
            const modelId = modelMap.get(lookupKey);
            if (!modelId) continue;

            for (const row of groupRows) {
                const color = row["Renk"] || "-";
                const size  = row["Beden"] || "-";
                const sku   = row["Stok Kodu"] || row["SKU"] ||
                    `${simpleSlug(parts[0])}-${simpleSlug(color)}-${size}`.toUpperCase();

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

        // Tek sorguda mevcut varyantları çek
        const existingVariants = await db.productVariant.findMany({
            where: {
                OR: [
                    { barcode: { in: allBarcodes } },
                    { sku:     { in: allSkus } }
                ]
            },
            select: { id: true, barcode: true, sku: true, salePrice: true, purchasePrice: true }
        });
        const existingBarcodeMap = new Map<string, typeof existingVariants[0]>();
        const existingSkuMap     = new Map<string, typeof existingVariants[0]>();
        for (const v of existingVariants) {
            if (v.barcode) existingBarcodeMap.set(v.barcode, v);
            if (v.sku)     existingSkuMap.set(v.sku, v);
        }

        // ── 7. Yeni ve Güncellenecek Satırları Ayır ──────────────────────────
        const toCreate: typeof prepared = [];
        const toUpdate: { id: string; purchasePrice: number; salePrice: number }[] = [];

        for (const p of prepared) {
            const existing = existingBarcodeMap.get(p.barcode) || existingSkuMap.get(p.sku);
            if (existing) {
                toUpdate.push({
                    id: existing.id,
                    purchasePrice: Number(p.row["Alış Fiyatı"]) || Number(existing.purchasePrice),
                    salePrice:     Number(p.row["Satış Fiyatı"]) || Number(existing.salePrice),
                });
            } else {
                toCreate.push(p);
            }
        }

        // ── 8. Güncellemeleri Toplu Yap (Her biri tek UPDATE, $transaction YOK) ──
        for (const u of toUpdate) {
            await db.productVariant.update({
                where: { id: u.id },
                data: { purchasePrice: u.purchasePrice, salePrice: u.salePrice }
            });
        }

        // ── 9. Yeni Varyantları createMany ile TEK SQL'DE Ekle ───────────────
        let newVariantIds: string[] = [];
        if (toCreate.length > 0) {
            // createMany id döndürmez, sonra geri okumalıyız
            await db.productVariant.createMany({
                data: toCreate.map(p => ({
                    modelId:       p.modelId,
                    color:         p.color,
                    size:          p.size,
                    sku:           p.sku,
                    barcode:       p.barcode,
                    purchasePrice: Number(p.row["Alış Fiyatı"]) || 0,
                    salePrice:     Number(p.row["Satış Fiyatı"]) || 0,
                })),
                skipDuplicates: true  // çakışma olursa sessizce atla
            });

            // Oluşturulan varyantları geri oku (id'leri almak için)
            const createdVariants = await db.productVariant.findMany({
                where: { barcode: { in: toCreate.map(p => p.barcode) } },
                select: { id: true, barcode: true }
            });
            const createdBarcodeToId = new Map(createdVariants.map(v => [v.barcode, v.id]));

            // ── 10. Stokları createMany ile TEK SQL'DE Ekle ─────────────────
            const stocksToCreate: { variantId: string; storeId: string; quantity: number }[] = [];

            for (const p of toCreate) {
                const variantId = createdBarcodeToId.get(p.barcode);
                if (!variantId) continue;

                for (const store of stores) {
                    const quantity = Number(p.row[store.name]);
                    if (!isNaN(quantity) && quantity >= 0) {
                        stocksToCreate.push({ variantId, storeId: store.id, quantity });
                    }
                }
            }

            if (stocksToCreate.length > 0) {
                await db.stock.createMany({
                    data: stocksToCreate,
                    skipDuplicates: true
                });
            }

            newVariantIds = createdVariants.map(v => v.id);
        }

        revalidatePath("/dashboard/products");

        const msg = `✅ İşlem Tamamlandı!\n\n` +
            `📥 Toplam Gelen: ${totalRows}\n` +
            `✨ Yeni Eklenen: ${toCreate.length}\n` +
            `🔄 Güncellenen: ${toUpdate.length}\n` +
            `🚫 Atlanan (İsmi Yok): ${emptyNameRows}\n` +
            `⚡ Kullanılan Sorgu: ~${4 + existingModels.length + toUpdate.length} (önceden: ${validRows.length * 5}+)`;

        return {
            success: true,
            message: msg,
            newVariants: [],   // createMany sonrası tam nesne dönmüyor, boş array kabul edilebilir
            diagnostics: { total: totalRows, valid: validRows.length, skipped: emptyNameRows }
        };

    } catch (error: any) {
        console.error("Bulk Import Error:", error);
        return { success: false, error: "İçe aktarım hatası: " + error.message }
    }
}
