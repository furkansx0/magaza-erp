"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache";

// --- Create Gift Card ---
export async function createGiftCard(data: {
    customerId: string;
    type: "FIXED_AMOUNT" | "PERCENTAGE";
    value: number; // Amount or Percentage
    daysValid: number;
}) {
    try {
        const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
        if (!customer) return { success: false, error: "Müşteri bulunamadı." };

        // Generate Human Readable 8-char Code (e.g. GC-X9A2)
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `GC-${randomPart}`;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + data.daysValid);

        const giftCard = await prisma.giftCard.create({
            data: {
                code,
                type: data.type,
                // Conditional fields
                initialAmount: data.type === "FIXED_AMOUNT" ? data.value : null,
                remainingBalance: data.type === "FIXED_AMOUNT" ? data.value : null,
                percentage: data.type === "PERCENTAGE" ? data.value : null,

                expiryDate: expiryDate,
                customerId: data.customerId,
            }
        });

        revalidatePath("/dashboard/customers");
        return { success: true, giftCard };

    } catch (error: any) {
        console.error("Create Gift Card Error:", error);
        return { success: false, error: "Hediye çeki oluşturulamadı." };
    }
}

// --- Cancel Gift Card ---
export async function cancelGiftCard(id: string) {
    try {
        // Check if card exists and is active
        const card = await prisma.giftCard.findUnique({ where: { id } });
        if (!card) return { success: false, error: "Hediye çeki bulunamadı." };

        // We don't delete, just set isActive = false
        // But schema has isActive default true.
        // Let's ensure we can set it to false.

        await prisma.giftCard.update({
            where: { id },
            data: { isActive: false }
        });

        revalidatePath("/dashboard/customers");
        return { success: true };
    } catch (error) {
        console.error("Cancel Gift Card Error:", error);
        return { success: false, error: "İptal edilirken hata oluştu." };
    }
}

// --- Validate Gift Card for Payment ---
export async function validateGiftCard(code: string, customerId: string) {
    if (!code) return { success: false, error: "Kod boş olamaz." };
    if (!customerId) return { success: false, error: "Müşteri seçili değil." };

    try {
        const card = await prisma.giftCard.findUnique({
            where: { code },
            include: { customer: true }
        });

        if (!card) return { success: false, error: "Geçersiz kod." };

        // 1. Ownership Check
        if (card.customerId !== customerId) {
            return {
                success: false,
                error: `Bu çek ${card.customer.name} kişisine aittir. Şu anki müşteride kullanılamaz.`
            };
        }

        // 2. Active Check
        if (!card.isActive) return { success: false, error: "Bu çek iptal edilmiş veya pasif." };

        // 3. Balance Check (Only for Fixed Amount)
        if (card.type === "FIXED_AMOUNT" && Number(card.remainingBalance) <= 0) {
            return { success: false, error: "Çek bakiyesi tükenmiş." };
        }

        // 4. Expiry Check
        if (new Date() > card.expiryDate) return { success: false, error: "Çek süresi dolmuş." };

        return {
            success: true,
            card: {
                id: card.id,
                code: card.code,
                type: card.type, // "FIXED_AMOUNT" | "PERCENTAGE"
                balance: card.remainingBalance ? Number(card.remainingBalance) : 0,
                percentage: card.percentage,
                ownerName: card.customer.name
            }
        };

    } catch (error) {
        return { success: false, error: "Doğrulama hatası." };
    }
}
