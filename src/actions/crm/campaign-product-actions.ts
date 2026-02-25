"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { createAuditLog } from "@/actions/settings/audit-actions"

export type ProductCampaignRule = {
    buyQuantity?: number;
    getQuantity?: number;
    discountPercent?: number; // 100 for free
    applyTo?: "CHEAPEST" | "EXPENSIVE";
    target: {
        type?: "CATEGORY" | "BRAND" | "PRODUCT" | "ALL"; // Deprecated
        ids?: string[]; // Deprecated
        categoryIds?: string[];
        brandIds?: string[];
        productIds?: string[];
    }
}

export type ProductCampaignFormValues = {
    name: string;
    description?: string;
    isActive: boolean;
    startDate: Date;
    endDate?: Date;
    storeIds: string[];
    type: string;
    rules: string; // JSON string from DTO layer
}

export async function getProductCampaigns(storeId?: string) {
    try {
        const campaigns = await db.productCampaign.findMany({
            orderBy: { createdAt: 'desc' },
        });

        // If storeId provided, filter in memory or query (Postgres array filter is syntax specific)
        // Since we use String[], simple query might be hard with Prisma without raw query or logic here.
        // For now, return all and filter client side or backend logic if simple.
        // Or if storeId is passed, we check if storeIds is empty OR includes storeId

        if (storeId) {
            return campaigns.filter(c =>
                c.storeIds.length === 0 || c.storeIds.includes(storeId)
            );
        }

        return campaigns;
    } catch (error) {
        console.error("Error fetching product campaigns:", error);
        return [];
    }
}

export async function createProductCampaign(data: ProductCampaignFormValues) {
    try {
        const campaign = await db.productCampaign.create({
            data: {
                name: data.name,
                description: data.description,
                isActive: data.isActive,
                startDate: data.startDate,
                endDate: data.endDate,
                storeIds: data.storeIds,
                type: data.type,
                rules: JSON.stringify(data.rules)
            }
        });

        await createAuditLog({
            action: "CREATE",
            entity: "ProductCampaign",
            entityId: campaign.id,
            details: `Kampanya oluşturuldu: ${campaign.name}`
        });

        revalidatePath("/dashboard/campaigns");
        return { success: true };
    } catch (error) {
        console.error("Error creating product campaign:", error);
        return { success: false, error: "Kampanya oluşturulurken bir hata oluştu." };
    }
}

export async function updateProductCampaign(id: string, data: ProductCampaignFormValues) {
    try {
        await db.productCampaign.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                isActive: data.isActive,
                startDate: data.startDate,
                endDate: data.endDate,
                storeIds: data.storeIds,
                type: data.type,
                rules: JSON.stringify(data.rules)
            }
        });
        revalidatePath("/dashboard/campaigns");
        return { success: true };
    } catch (error) {
        console.error("Error updating product campaign:", error);
        return { success: false, error: "Kampanya güncellenirken bir hata oluştu." };
    }
}

export async function deleteProductCampaign(id: string) {
    try {
        await db.productCampaign.delete({
            where: { id }
        });
        revalidatePath("/dashboard/campaigns");
        return { success: true };
    } catch (error) {
        console.error("Error deleting product campaign:", error);
        return { success: false, error: "Kampanya silinirken bir hata oluştu." };
    }
}

export async function toggleProductCampaignStatus(id: string, isActive: boolean) {
    try {
        await db.productCampaign.update({
            where: { id },
            data: { isActive }
        });
        revalidatePath("/dashboard/campaigns");
        return { success: true };
    } catch (error) {
        console.error("Error toggling product campaign:", error);
        return { success: false, error: "Durum güncellenirken bir hata oluştu." };
    }
}
