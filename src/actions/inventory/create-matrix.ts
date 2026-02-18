"use server"

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuditLog } from "@/actions/settings/audit-actions";

// --- Validation Schemas --- //
const VariantSchema = z.object({
    id: z.string(), // Temporary ID for frontend tracking
    color: z.string(),
    size: z.string(),
    barcode: z.string().optional(), // Allow empty, will default to SKU in backend
    purchasePrice: z.number().min(0, "Alış fiyatı negatif olamaz"),
    salePrice: z.number().min(0, "Satış fiyatı negatif olamaz"),
    stocks: z.record(z.string(), z.number()), // StoreId -> Quantity
});

const MatrixSchema = z.object({
    name: z.string().min(2, "Model adı gereklidir"),
    brand: z.string().optional(),
    category: z.string().optional(),
    gender: z.string().optional(),
    description: z.string().optional(),
    // New Fields
    subCategory: z.string().optional(),
    material: z.string().optional(),
    style: z.string().optional(),
    season: z.string().optional(),
    modelCode: z.string().optional(),

    existingModelId: z.string().optional(), // New: Append Mode

    variants: z.array(VariantSchema).min(1, "En az 1 varyant oluşturmalısınız"),
});

export type MatrixFormValues = z.infer<typeof MatrixSchema>;

export async function createProductMatrix(data: MatrixFormValues) {
    try {
        const validated = MatrixSchema.parse(data);

        return await db.$transaction(async (tx) => {
            let model;

            if (validated.existingModelId) {
                // APPEND MODE: Fetch existing model
                model = await tx.productModel.findUnique({
                    where: { id: validated.existingModelId }
                });
                if (!model) throw new Error("Model bulunamadı.");
            } else {
                // CREATE MODE: Create new model
                model = await tx.productModel.create({
                    data: {
                        name: validated.name,
                        brand: validated.brand,
                        category: validated.category,
                        gender: validated.gender,
                        description: validated.description,
                        subCategory: validated.subCategory,
                        material: validated.material,
                        style: validated.style,
                        season: validated.season,
                        modelCode: validated.modelCode,
                    }
                });
            }

            // 2. Create Variants & Stock
            for (const v of validated.variants) {
                // Generate a SKU if not provided or just use pattern
                const sku = `${model.name.substring(0, 4)}-${v.color.substring(0, 3)}-${v.size}`.toUpperCase().replace(/\s+/g, '');

                // Fallback for barcode: If empty/whitespace (should be caught by Zod but just in case) or duplicate in batch?
                // Actually, if user wants same barcode for all variants (bad practice but happens), we can't allow it due to DB unique.
                // But we can fallback to using SKU as barcode if barcode is missing.
                // However, user likely entered duplicates manually in the same batch.

                // If barcode is effectively "empty" in input (passed validation somehow) or we want to support empty -> default:
                const finalBarcode = v.barcode && v.barcode.trim().length > 0 ? v.barcode : sku;

                const variant = await tx.productVariant.create({
                    data: {
                        modelId: model.id,
                        color: v.color,
                        size: v.size,
                        barcode: finalBarcode,
                        sku: sku,
                        purchasePrice: v.purchasePrice,
                        salePrice: v.salePrice,
                    }
                });

                // ... stock creation ...
                for (const [storeId, quantity] of Object.entries(v.stocks)) {
                    if (quantity > 0) {
                        await tx.stock.create({
                            data: {
                                variantId: variant.id,
                                storeId: storeId,
                                quantity: quantity
                            }
                        });
                    }
                }
            }

            try {
                // Audit Log inside loop or bulk? Single summary log is better.
                // We can't await inside the client transaction easily for external actions if valid.
                // Actually we can, prisma transaction allows async.
            } catch (e) { }

            return { modelId: model.id, variantCount: validated.variants.length, modelName: model.name };
        });

        await createAuditLog({
            action: "PRODUCT_CREATE",
            entity: "ProductModel",
            entityId: result.modelId,
            details: `Model oluşturuldu: ${result.modelName} (${result.variantCount} varyant)`
        });

        revalidatePath("/dashboard/products");
        return { success: true, message: `Model ve ${result.variantCount} varyant başarıyla kaydedildi.` };

    } catch (error: any) {
        console.error("Matrix creation error:", error);
        if (error.code === 'P2002') {
            // Check if target is barcode
            const target = error.meta?.target;
            if (Array.isArray(target) && target.includes('barcode')) {
                return { success: false, message: "Hata: Girilen barkodlardan biri ('" + (target || "bilinmeyen") + "') sistemde veya bu işlemde mükerrer kullanılıyor. Her varyantın barkodu benzersiz olmalıdır." };
            }
            return { success: false, message: "Hata: Bu kayıt (barkod veya kullanıcı adı) sistemde zaten mevcut." };
        }
        return { success: false, message: error.message || "İşlem başarısız oldu." };
    }
}
