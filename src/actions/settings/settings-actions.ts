"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

/**
 * Retrieves all system settings, optionally filtered by group.
 */
export async function getSettings(group?: string) {
    try {
        const where = group ? { group } : {};
        const settings = await prisma.systemSetting.findMany({
            where,
            orderBy: { key: 'asc' }
        });
        return { success: true, settings };
    } catch (error) {
        console.error("Get Settings Error:", error);
        return { success: false, error: "Ayarlar çekilemedi." };
    }
}

/**
 * Retrieves a single setting by key.
 * Used internally by other modules.
 */
export async function getSettingByKey(key: string) {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key }
        });
        return setting ? setting.value : null;
    } catch (error) {
        return null; // Fail safe
    }
}

/**
 * Updates or creates a system setting.
 */
export async function updateSetting(key: string, value: any, description?: string, group: string = 'GENERAL') {
    try {
        await prisma.systemSetting.upsert({
            where: { key },
            create: {
                key,
                value,
                description,
                group
            },
            update: {
                value,
                ...(description ? { description } : {}),
                ...(group ? { group } : {})
            }
        });

        revalidatePath("/dashboard/settings");
        return { success: true, message: "Ayar güncellendi." };
    } catch (error) {
        console.error("Update Setting Error:", error);
        return { success: false, error: "Güncelleme başarısız." };
    }
}

/**
 * Initialize default settings if they don't exist.
 * This can be called on dashboard load or via a button.
 */
export async function initDefaultSettings() {
    const defaults = [
        {
            key: "inventory.transfer_rules",
            group: "INVENTORY",
            description: "Mağazalar arası transfer mantığı yapılandırması.",
            value: {
                min_transfer_threshold: 3,
                aggressive_factor: 3,
                retention_strategy: "KEEP_SMALLEST", // KEEP_SMALLEST, KEEP_LARGEST, KEEP_EDGES, KEEP_MOST_STOCKED, DRAIN_ALL
                retention_count: 1
            }
        },
        {
            key: "product.attributes",
            group: "PRODUCT",
            description: "Ürünlere eklenebilecek dinamik özellikler.",
            value: [
                { key: "fabric_type", label: "Kumaş Tipi", type: "select", options: ["Pamuk", "Polyester", "Keten", "Yün"] },
                { key: "season", label: "Sezon", type: "text" },
                { key: "origin", label: "Menşei", type: "text" }
            ]
        }
    ];

    let count = 0;
    for (const def of defaults) {
        const existing = await prisma.systemSetting.findUnique({ where: { key: def.key } });
        if (!existing) {
            await prisma.systemSetting.create({
                data: {
                    key: def.key,
                    group: def.group,
                    description: def.description,
                    value: def.value
                }
            });
            count++;
        }
    }

    if (count > 0) revalidatePath("/dashboard/settings");
    return { success: true, message: `${count} varsayılan ayar oluşturuldu.` };
}
