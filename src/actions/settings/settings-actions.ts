"use server"

import { db } from "@/lib/db"
import { cache } from "react"

export const getSettingByKey = cache(async (key: string) => {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key }
        });
        return setting?.value || null;
    } catch {
        return null;
    }
});

export async function initDefaultSettings() {
    try {
        const defaultSettings = [
            { key: "ui.sidebar.labels", value: { dashboard: "Panel", pos: "Satış", stores: "Mağazalar" }, type: "json" },
            { key: "system.is_installed", value: "true", type: "boolean" }
        ];

        for (const s of defaultSettings) {
            await db.systemSetting.upsert({
                where: { key: s.key },
                create: { key: s.key, value: s.value, group: "GENERAL" },
                update: {} // don't overwrite if exists
            });
        }
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function updateSetting(key: string, value: any, description?: string, group?: string) {
    try {
        await db.systemSetting.upsert({
            where: { key },
            create: { key, value: JSON.stringify(value), group: group || "GENERAL", description },
            update: { value: JSON.stringify(value), description, group: group || "GENERAL" }
        });
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}
