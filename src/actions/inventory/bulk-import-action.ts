"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { generateNextBarcodes } from "./barcode-actions";

// -------------------------------------------------------------------
// Each row can be one of 3 types, detected BEFORE processing:
//
// "FULL"         - All fields provided → create/update entire hierarchy
// "VARIANT_ADD"  - ModelCode + Color + Size only → add variant to existing model
// "BARCODE_ONLY" - Only barcode + stocks → stock update on existing variant
// -------------------------------------------------------------------

export interface SmartImportRow {
    // Identification (used for type detection)
    modelCode?: string;
    color?: string;
    size?: string;
    barcode?: string;
    sku?: string;

    // Optional metadata (required for FULL rows, looked up for VARIANT_ADD)
    gender?: string;
    brand?: string;
    seasonType?: string;
    seasonYear?: string;
    category?: string;
    subCategory?: string;

    // Pricing (optional - kept from previous if VARIANT_ADD)
    purchasePrice?: number;
    salePrice?: number;

    stocks: Record<string, string | number>; // storeName -> quantity ("+5" = increment, "5" = set)
}

export interface ImportReport {
    success: boolean;
    summary: {
        totalRows: number;
        fullRows: number;
        variantAddRows: number;
        barcodeOnlyRows: number;
        modelsUpserted: number;
        colorsUpserted: number;
        variantsUpserted: number;
        stocksUpdated: number;
        failedRows: number;
    };
    logs: { type: "info" | "success" | "warning" | "error"; message: string }[];
}

type RowType = "FULL" | "VARIANT_ADD" | "BARCODE_ONLY" | "INVALID";

function detectRowType(r: SmartImportRow): RowType {
    const hasBarcode = !!(r.barcode && r.barcode.trim());
    const hasModelCode = !!(r.modelCode && r.modelCode.trim());
    const hasColor = !!(r.color && r.color.trim());
    const hasSize = !!(r.size && r.size.trim());
    const hasMetadata = !!(r.brand || r.gender || r.category);

    if (hasModelCode && hasColor && hasSize && hasMetadata) return "FULL";
    if (hasModelCode && hasColor && hasSize) return "VARIANT_ADD";
    if (hasBarcode) return "BARCODE_ONLY";
    return "INVALID";
}

/**
 * Smart Retail Engine V6 - Intelligent Bulk Import
 * Supports 3 row types + High-Performance Raw SQL Batching
 */
export async function runSmartImport(rows: SmartImportRow[], stores: { id: string, name: string }[]): Promise<ImportReport> {
    const report: ImportReport = {
        success: true,
        summary: {
            totalRows: rows.length,
            fullRows: 0, variantAddRows: 0, barcodeOnlyRows: 0,
            modelsUpserted: 0, colorsUpserted: 0, variantsUpserted: 0,
            stocksUpdated: 0, failedRows: 0
        },
        logs: []
    };

    if (rows.length === 0) {
        return { ...report, success: false, logs: [{ type: "error", message: "İçe aktarılacak veri bulunamadı." }] };
    }

    try {
        // =====================================
        // PHASE 0: CLASSIFY ROWS
        // =====================================
        const fullRows: SmartImportRow[] = [];
        const variantAddRows: SmartImportRow[] = [];
        const barcodeOnlyRows: SmartImportRow[] = [];

        for (const r of rows) {
            const type = detectRowType(r);
            if (type === "FULL") { fullRows.push(r); report.summary.fullRows++; }
            else if (type === "VARIANT_ADD") { variantAddRows.push(r); report.summary.variantAddRows++; }
            else if (type === "BARCODE_ONLY") { barcodeOnlyRows.push(r); report.summary.barcodeOnlyRows++; }
            else {
                report.summary.failedRows++;
                report.logs.push({ type: "error", message: `Geçersiz satır atlandı: Barkod, ModelKodu+Renk+Beden veya tam bilgi gereklidir.` });
            }
        }

        // ====================================================
        // PHASE 1: PRE-FETCH EXISTING DATA (DB Lookups)
        // ====================================================

        // 1a. For VARIANT_ADD rows: fetch existing model metadata from DB
        const variantAddModelCodes = [...new Set(variantAddRows.map(r => r.modelCode!.trim().toUpperCase()))];
        const existingModels = variantAddModelCodes.length > 0
            ? await db.productModel.findMany({
                where: { modelCode: { in: variantAddModelCodes } },
                select: { id: true, modelCode: true, brand: true, gender: true, seasonType: true, seasonYear: true, category: true, subCategory: true }
            })
            : [];
        const existingModelMap = new Map(existingModels.map(m => [m.modelCode!, m]));

        // Hydrate VARIANT_ADD rows with existing model data
        const hydratedVariantAddRows = variantAddRows.map(r => {
            const mCode = r.modelCode!.trim().toUpperCase();
            const existingModel = existingModelMap.get(mCode);
            return {
                ...r,
                modelCode: mCode,
                color: r.color!.trim().toUpperCase(),
                // Fill in missing metadata from DB
                brand: r.brand || existingModel?.brand || "Genel",
                gender: r.gender || existingModel?.gender || "Unisex",
                seasonType: r.seasonType || existingModel?.seasonType || "4 Mevsim",
                seasonYear: r.seasonYear || existingModel?.seasonYear || "Genel",
                category: r.category || existingModel?.category || "Genel",
                subCategory: r.subCategory || existingModel?.subCategory || "Genel",
            };
        });

        // 1b. For BARCODE_ONLY rows: fetch existing variant IDs from DB
        const barcodeOnlyBarcodes = [...new Set(barcodeOnlyRows.filter(r => r.barcode?.trim()).map(r => r.barcode!.trim()))];
        const existingVariants = barcodeOnlyBarcodes.length > 0
            ? await db.productVariant.findMany({
                where: { barcode: { in: barcodeOnlyBarcodes } },
                select: { id: true, barcode: true }
            })
            : [];
        const existingVariantMap = new Map(existingVariants.map(v => [v.barcode, v.id]));

        // ====================================================
        // PHASE 2: BARCODE GENERATION for rows that need it
        // ====================================================
        // Rows needing barcodes: FULL + VARIANT_ADD rows with no barcode
        const allHierarchyRows = [
            ...fullRows.map(r => ({ ...r, modelCode: r.modelCode!.trim().toUpperCase(), color: r.color!.trim().toUpperCase() })),
            ...hydratedVariantAddRows
        ];

        const rowsNeedingBarcodes = allHierarchyRows.filter(r => !r.barcode || r.barcode.trim() === "");
        let generatedBarcodes: string[] = [];
        if (rowsNeedingBarcodes.length > 0) {
            const res = await generateNextBarcodes(rowsNeedingBarcodes.length);
            if (res.success && res.barcodes) {
                generatedBarcodes = res.barcodes;
            } else {
                throw new Error("Barkod üretimi başarısız: " + (res.error || "Bilinmeyen hata"));
            }
        }

        let barcodeIdx = 0;
        const normalizedHierarchyRows = allHierarchyRows.map(r => {
            const barcode = (r.barcode && r.barcode.trim() !== "")
                ? r.barcode.trim()
                : generatedBarcodes[barcodeIdx++];
            const sku = (r.sku && r.sku.trim() !== "")
                ? r.sku.trim()
                : `${r.modelCode}-${r.color}-${r.size}`.toUpperCase();
            return { ...r, barcode: barcode.trim(), sku: sku.trim() };
        });

        // ====================================================
        // PHASE 3: HIGH-PERFORMANCE BATCH SQL TRANSACTION
        // ====================================================
        const dbVariantMap = new Map<string, string>(); // barcode -> variantId (populated from SQL result)

        if (normalizedHierarchyRows.length > 0) {
            await db.$transaction(async (tx) => {

                // --- LAYER 1: PRODUCT MODELS ---
                const modelMap = new Map<string, any>();
                for (const r of normalizedHierarchyRows) {
                    if (!modelMap.has(r.modelCode!)) {
                        modelMap.set(r.modelCode!, {
                            modelCode: r.modelCode,
                            name: r.modelCode,
                            brand: r.brand || "Genel",
                            gender: r.gender || "Unisex",
                            seasonYear: r.seasonYear || "Genel",
                            seasonType: r.seasonType || "4 Mevsim",
                            category: r.category || "Genel",
                            subCategory: r.subCategory || "Genel",
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

                const dbModelMap = new Map(modelsResult.map(m => [m.modelCode, m.id]));
                report.summary.modelsUpserted = modelPayloads.length;

                // --- LAYER 2: PRODUCT COLORS ---
                const colorMap = new Map<string, any>();
                for (const r of normalizedHierarchyRows) {
                    const mId = dbModelMap.get(r.modelCode!);
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
                report.summary.colorsUpserted = colorPayloads.length;

                // --- LAYER 3: PRODUCT VARIANTS ---
                const variantMap = new Map<string, any>();
                for (const r of normalizedHierarchyRows) {
                    const mId = dbModelMap.get(r.modelCode!);
                    if (!mId) continue;
                    const cId = dbColorMap.get(`${mId}___${r.color}`);
                    if (!cId) continue;
                    if (!variantMap.has(r.barcode!)) {
                        variantMap.set(r.barcode!, {
                            colorId: cId,
                            barcode: r.barcode,
                            size: r.size || "-",
                            sku: r.sku,
                            purchasePrice: Number(r.purchasePrice) || 0,
                            salePrice: Number(r.salePrice) || 0
                        });
                    }
                }
                const variantPayloads = Array.from(variantMap.values());

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
                            "purchasePrice" = CASE WHEN EXCLUDED."purchasePrice" > 0 THEN EXCLUDED."purchasePrice" ELSE "ProductVariant"."purchasePrice" END,
                            "salePrice" = CASE WHEN EXCLUDED."salePrice" > 0 THEN EXCLUDED."salePrice" ELSE "ProductVariant"."salePrice" END,
                            "updatedAt" = NOW()
                        RETURNING "id", "barcode";
                    `, JSON.stringify(variantPayloads));

                    for (const v of variantsResult) dbVariantMap.set(v.barcode, v.id);
                }
                report.summary.variantsUpserted = variantPayloads.length;

                // --- LAYER 4: STOCKS (FULL + VARIANT_ADD rows) ---
                const stockSetPayloads: any[] = [];
                const stockIncrementPayloads: any[] = [];

                for (const r of normalizedHierarchyRows) {
                    const vId = dbVariantMap.get(r.barcode!);
                    if (!vId) continue;

                    for (const store of stores) {
                        const rawVal = r.stocks[store.name];
                        if (rawVal === undefined || rawVal === null || rawVal === "" || rawVal === 0) continue;
                        const isStr = typeof rawVal === "string";
                        const strVal = String(rawVal).trim();
                        const isInc = isStr && (strVal.startsWith("+") || strVal.startsWith("-"));
                        const qty = Number(rawVal) || 0;
                        const p = { variantId: vId, storeId: store.id, quantity: qty };
                        if (isInc) stockIncrementPayloads.push(p);
                        else stockSetPayloads.push(p);
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
                report.summary.stocksUpdated += stockSetPayloads.length + stockIncrementPayloads.length;

            }, { timeout: 60000, maxWait: 15000 });
        }

        // ====================================================
        // PHASE 4: BARCODE-ONLY STOCK UPDATES (outside main tx)
        // ====================================================
        if (barcodeOnlyRows.length > 0) {
            const barcodeStockSetPayloads: any[] = [];
            const barcodeStockIncrementPayloads: any[] = [];

            for (const r of barcodeOnlyRows) {
                if (!r.barcode?.trim()) continue;
                const vId = existingVariantMap.get(r.barcode.trim());
                if (!vId) {
                    report.summary.failedRows++;
                    report.logs.push({ type: "warning", message: `Barkod bulunamadı DB'de, atlandı: ${r.barcode}` });
                    continue;
                }

                for (const store of stores) {
                    const rawVal = r.stocks[store.name];
                    if (rawVal === undefined || rawVal === null || rawVal === "" || rawVal === 0) continue;
                    const isStr = typeof rawVal === "string";
                    const strVal = String(rawVal).trim();
                    const isInc = isStr && (strVal.startsWith("+") || strVal.startsWith("-"));
                    const qty = Number(rawVal) || 0;
                    const p = { variantId: vId, storeId: store.id, quantity: qty };
                    if (isInc) barcodeStockIncrementPayloads.push(p);
                    else barcodeStockSetPayloads.push(p);
                }
            }

            if (barcodeStockSetPayloads.length > 0) {
                await db.$executeRawUnsafe(`
                    INSERT INTO "Stock" ("id", "variantId", "storeId", "quantity")
                    SELECT gen_random_uuid()::text, "variantId", "storeId", "quantity"
                    FROM jsonb_to_recordset($1::jsonb) AS x("variantId" text, "storeId" text, "quantity" int)
                    ON CONFLICT ("variantId", "storeId") DO UPDATE SET "quantity" = EXCLUDED."quantity";
                `, JSON.stringify(barcodeStockSetPayloads));
            }
            if (barcodeStockIncrementPayloads.length > 0) {
                await db.$executeRawUnsafe(`
                    INSERT INTO "Stock" ("id", "variantId", "storeId", "quantity")
                    SELECT gen_random_uuid()::text, "variantId", "storeId", "quantity"
                    FROM jsonb_to_recordset($1::jsonb) AS x("variantId" text, "storeId" text, "quantity" int)
                    ON CONFLICT ("variantId", "storeId") DO UPDATE SET "quantity" = "Stock"."quantity" + EXCLUDED."quantity";
                `, JSON.stringify(barcodeStockIncrementPayloads));
            }
            report.summary.stocksUpdated += barcodeStockSetPayloads.length + barcodeStockIncrementPayloads.length;
        }

        report.logs.push({
            type: "success",
            message: `Tamamlandı! ${report.summary.fullRows} tam kayıt, ${report.summary.variantAddRows} varyant eki, ${report.summary.barcodeOnlyRows} stok güncellemesi işlendi.`
        });
        revalidatePath("/dashboard/products");
        return report;

    } catch (err: any) {
        console.error("Smart Import V6 Error:", err);
        return {
            ...report,
            success: false,
            logs: [{ type: "error", message: `Import Hatası: ${err.message}` }]
        };
    }
}
