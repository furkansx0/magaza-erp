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
 * Smart Retail Engine V6 - High-Performance Bulk Import Action
 * Using Neon SQL Faster Principles (Raw Bulk Upserts)
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
                sku: sku.trim(),
                color: r.color.trim().toUpperCase() || "-"
            };
        });

        // 2. High-Performance Bulk Transaction Execution
        await db.$transaction(async (tx) => {
            
            // ==========================================
            // LAYER 1: PRODUCT MODELS
            // ==========================================
            const modelMap = new Map<string, any>();
            for (const r of normalizedRows) {
                if (!modelMap.has(r.modelCode)) {
                    modelMap.set(r.modelCode, {
                        modelCode: r.modelCode,
                        name: r.modelCode,
                        brand: r.brand || "Genel",
                        gender: r.gender,
                        seasonYear: r.seasonYear,
                        seasonType: r.seasonType,
                        category: r.category,
                        subCategory: r.subCategory,
                        description: "Smart Engine Bulk V6"
                    });
                }
            }
            const modelPayloads = Array.from(modelMap.values());
            
            const modelsResult = await tx.$queryRawUnsafe<any[]>(`
                INSERT INTO "ProductModel" ("id", "modelCode", "name", "brand", "gender", "seasonYear", "seasonType", "category", "subCategory", "description", "updatedAt")
                SELECT gen_random_uuid()::text, "modelCode", "name", "brand", "gender", "seasonYear", "seasonType", "category", "subCategory", "description", NOW()
                FROM jsonb_to_recordset($1::jsonb) AS x(
                    "modelCode" text, "name" text, "brand" text, "gender" text, 
                    "seasonYear" text, "seasonType" text, "category" text, 
                    "subCategory" text, "description" text
                )
                ON CONFLICT ("modelCode") DO UPDATE SET
                    "brand" = coalesce(EXCLUDED."brand", "ProductModel"."brand"),
                    "gender" = coalesce(EXCLUDED."gender", "ProductModel"."gender"),
                    "seasonYear" = coalesce(EXCLUDED."seasonYear", "ProductModel"."seasonYear"),
                    "seasonType" = coalesce(EXCLUDED."seasonType", "ProductModel"."seasonType"),
                    "category" = coalesce(EXCLUDED."category", "ProductModel"."category"),
                    "subCategory" = coalesce(EXCLUDED."subCategory", "ProductModel"."subCategory"),
                    "updatedAt" = NOW()
                RETURNING "id", "modelCode";
            `, JSON.stringify(modelPayloads));

            // Map model codes to their newly generated (or existing) Postgres UUIDs
            const dbModelMap = new Map(modelsResult.map(m => [m.modelCode, m.id]));
            report.summary.modelsCreated = modelPayloads.length;


            // ==========================================
            // LAYER 2: PRODUCT COLORS
            // ==========================================
            const colorMap = new Map<string, any>();
            for (const r of normalizedRows) {
                const mId = dbModelMap.get(r.modelCode);
                if (!mId) continue;
                
                const cKey = `${mId}___${r.color}`;
                if (!colorMap.has(cKey)) {
                    colorMap.set(cKey, { modelId: mId, name: r.color });
                }
            }
            const colorPayloads = Array.from(colorMap.values());

            let dbColorMap = new Map<string, string>();
            if (colorPayloads.length > 0) {
                const colorsResult = await tx.$queryRawUnsafe<any[]>(`
                    INSERT INTO "ProductColor" ("id", "modelId", "name", "updatedAt")
                    SELECT gen_random_uuid()::text, "modelId", "name", NOW()
                    FROM jsonb_to_recordset($1::jsonb) AS x("modelId" text, "name" text)
                    ON CONFLICT ("modelId", "name") DO UPDATE SET "updatedAt" = NOW()
                    RETURNING "id", "modelId", "name";
                `, JSON.stringify(colorPayloads));

                dbColorMap = new Map(colorsResult.map(c => [`${c.modelId}___${c.name}`, c.id]));
            }
            report.summary.colorsCreated = colorPayloads.length;


            // ==========================================
            // LAYER 3: PRODUCT VARIANTS
            // ==========================================
            const variantMap = new Map<string, any>();
            for (const r of normalizedRows) {
                const mId = dbModelMap.get(r.modelCode);
                if (!mId) continue;
                const cId = dbColorMap.get(`${mId}___${r.color}`);
                if (!cId) continue;
                
                if (!variantMap.has(r.barcode)) {
                    variantMap.set(r.barcode, {
                        colorId: cId,
                        barcode: r.barcode,
                        size: r.size,
                        sku: r.sku,
                        purchasePrice: Number(r.purchasePrice),
                        salePrice: Number(r.salePrice)
                    });
                }
            }
            const variantPayloads = Array.from(variantMap.values());

            let dbVariantMap = new Map<string, string>();
            if (variantPayloads.length > 0) {
                const variantsResult = await tx.$queryRawUnsafe<any[]>(`
                    INSERT INTO "ProductVariant" ("id", "colorId", "barcode", "size", "sku", "purchasePrice", "salePrice", "updatedAt")
                    SELECT gen_random_uuid()::text, "colorId", "barcode", "size", "sku", "purchasePrice", "salePrice", NOW()
                    FROM jsonb_to_recordset($1::jsonb) AS x(
                        "colorId" text, "barcode" text, "size" text, "sku" text, 
                        "purchasePrice" numeric, "salePrice" numeric
                    )
                    ON CONFLICT ("barcode") DO UPDATE SET
                        "size" = EXCLUDED."size",
                        "sku" = coalesce(EXCLUDED."sku", "ProductVariant"."sku"),
                        "purchasePrice" = EXCLUDED."purchasePrice",
                        "salePrice" = EXCLUDED."salePrice",
                        "updatedAt" = NOW()
                    RETURNING "id", "barcode";
                `, JSON.stringify(variantPayloads));

                dbVariantMap = new Map(variantsResult.map(v => [v.barcode, v.id]));
            }
            report.summary.variantsCreated = variantPayloads.length;


            // ==========================================
            // LAYER 4: STOCK UPDATES
            // ==========================================
            const stockSetPayloads: any[] = [];
            const stockIncrementPayloads: any[] = [];

            for (const r of normalizedRows) {
                const vId = dbVariantMap.get(r.barcode);
                if (!vId) {
                    report.logs.push({ type: "warning", message: `Varyant atlandı: ${r.barcode}` });
                    continue;
                }

                for (const store of stores) {
                    const rawVal = r.stocks[store.name];
                    if (rawVal === undefined || rawVal === null) continue; // Skip empty cells if mapped

                    const isStr = typeof rawVal === "string";
                    const strVal = String(rawVal || "0").trim();
                    const isInc = isStr && (strVal.startsWith("+") || strVal.startsWith("-"));
                    const qty = Number(rawVal) || 0;

                    const p = { variantId: vId, storeId: store.id, quantity: qty };
                    
                    if (isInc || r.operationType === "EKLE") {
                        stockIncrementPayloads.push(p);
                    } else {
                        stockSetPayloads.push(p);
                    }
                }
            }

            if (stockSetPayloads.length > 0) {
                await tx.$executeRawUnsafe(`
                    INSERT INTO "Stock" ("id", "variantId", "storeId", "quantity")
                    SELECT gen_random_uuid()::text, "variantId", "storeId", "quantity"
                    FROM jsonb_to_recordset($1::jsonb) AS x("variantId" text, "storeId" text, "quantity" int)
                    ON CONFLICT ("variantId", "storeId") DO UPDATE SET "quantity" = EXCLUDED."quantity";
                `, JSON.stringify(stockSetPayloads));
            }

            if (stockIncrementPayloads.length > 0) {
                await tx.$executeRawUnsafe(`
                    INSERT INTO "Stock" ("id", "variantId", "storeId", "quantity")
                    SELECT gen_random_uuid()::text, "variantId", "storeId", "quantity"
                    FROM jsonb_to_recordset($1::jsonb) AS x("variantId" text, "storeId" text, "quantity" int)
                    ON CONFLICT ("variantId", "storeId") DO UPDATE SET "quantity" = "Stock"."quantity" + EXCLUDED."quantity";
                `, JSON.stringify(stockIncrementPayloads));
            }

            report.summary.stocksUpdated = stockSetPayloads.length + stockIncrementPayloads.length;

        }, {
            timeout: 60000,
            maxWait: 15000
        });

        report.logs.push({ type: "success", message: "Yüksek hızlı SQL Import başarıyla tamamlandı!" });
        revalidatePath("/dashboard/products");
        return report;

    } catch (err: any) {
        console.error("Smart Import Global SQL Error:", err);
        return {
            ...report,
            success: false,
            logs: [{ type: "error", message: `Import Hatası: ${err.message}` }]
        };
    }
}
