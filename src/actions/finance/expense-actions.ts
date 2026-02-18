"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache";

import { getStoreCashBalance } from "./cash-actions";

export async function addStoreExpense(data: {
    amount: number;
    description: string;
    storeId: string;
}) {
    try {
        // 1. Check Balance
        const { balance } = await getStoreCashBalance(data.storeId);
        if (data.amount > balance) {
            return {
                success: false,
                error: `Yetersiz Bakiye! Kasada sadece ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(balance)} mevcut. İşlem yapılamaz.`
            };
        }

        await prisma.storeExpense.create({
            data: {
                amount: data.amount,
                description: data.description,
                storeId: data.storeId
            }
        });
        revalidatePath("/dashboard/pos");
        return { success: true };
    } catch (error: any) {
        console.error("Expense Error Detailed:", error);
        return { success: false, error: "Gider kaydedilemedi: " + (error.message || error) };
    }
}

export async function getDailyStoreExpenses(storeId: string) {
    if (!storeId) return [];

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const expenses = await prisma.storeExpense.findMany({
        where: {
            storeId,
            createdAt: {
                gte: start,
                lte: end
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return expenses.map(e => ({
        id: e.id,
        amount: Number(e.amount),
        description: e.description,
        createdAt: e.createdAt
    }));
}
