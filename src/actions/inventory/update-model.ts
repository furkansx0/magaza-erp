"use server"

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdateModelSchema = z.object({
    id: z.string(),
    name: z.string().min(2, "Model adı en az 2 karakter olmalıdır"),
    category: z.string().optional(),
    brand: z.string().optional(),
    gender: z.string().optional(),
    season: z.string().optional(),
});

export async function updateProductModel(data: z.infer<typeof UpdateModelSchema>) {
    try {
        const validated = UpdateModelSchema.parse(data);

        await db.productModel.update({
            where: { id: validated.id },
            data: {
                name: validated.name,
                category: validated.category,
                brand: validated.brand,
                gender: validated.gender,
                season: validated.season,
            }
        });

        revalidatePath("/dashboard/products");
        return { success: true, message: "Model bilgileri güncellendi." };

    } catch (error: unknown) {
        console.error("Model update error:", error);
        let message = "Güncelleme başarısız.";
        if (error instanceof Error) {
            message = error.message;
        }
        return { success: false, message };
    }
}
