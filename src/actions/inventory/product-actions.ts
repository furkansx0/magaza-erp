"use server"

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProductSchema = z.object({
    name: z.string().min(2, "Ürün adı en az 2 karakter olmalıdır"),
    barcode: z.string().min(3, "Barkod en az 3 karakter olmalıdır"),
    category: z.string().optional(),
    purchasePrice: z.coerce.number().min(0, "Alış fiyatı 0'dan küçük olamaz"),
    salePrice: z.coerce.number().min(0, "Satış fiyatı 0'dan küçük olamaz"),
});

export type ProductFormValues = z.infer<typeof ProductSchema>;

export async function createProduct(data: ProductFormValues) {
    try {
        const validated = ProductSchema.parse(data);

        await db.product.create({
            data: {
                name: validated.name,
                barcode: validated.barcode,
                category: validated.category,
                purchasePrice: validated.purchasePrice,
                salePrice: validated.salePrice,
                // Initial stock creation logic can be added here or separately
            }
        });

        revalidatePath("/dashboard/products");
        return { success: true, message: "Ürün başarıyla oluşturuldu." };
    } catch (error) {
        console.error("Product creation error:", error);
        return { success: false, message: "Ürün oluşturulurken bir hata oluştu." };
    }
}
