"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache";

import { getStoreCashBalance } from "./cash-actions";

export async function addCashClosing(data: {
    countedCash: number;
    cashDifference?: number;
    note?: string;
    storeId: string;
    cashierId: string;
}) {
    try {
        // 1. Re-Calculate Difference Securely on Server
        // We trusted client previously, but for Ledger actions we must be sure.
        const balanceRes = await getStoreCashBalance(data.storeId);
        const systemBalance = balanceRes.balance || 0;
        const diff = data.countedCash - systemBalance;
        // Example: System=1000, Count=950. Diff = -50.
        // User Logic: "Loss/Deficit" (Açık). 
        // To fix System Balance (1000) to become (950), we need to REDUCE balance by 50.
        // Reduce Balance = Add Expense.
        // So we add Expense of +50.

        // Example 2: System=1000, Count=1050. Diff = +50.
        // To fix System Balance (1000) to become (1050), we need to INCREASE balance by 50.
        // Increase Balance = Add Negative Expense (Income/Correction).

        // Expense Amount should be: (SystemBalance - CountedCash).
        // If Sys=1000, Count=950. ExpAmount = 50. (Positive Expense -> Reduces Balance). Correct.
        // If Sys=1000, Count=1050. ExpAmount = -50. (Negative Expense -> Increases Balance). Correct.

        const adjustmentAmount = systemBalance - data.countedCash;

        // 2. Create Closing Log
        await db.cashRegisterClosing.create({
            data: {
                countedCash: data.countedCash,
                cashDifference: diff, // Store raw diff (Count - Sys) for reporting "High/Low"
                note: data.note,
                storeId: data.storeId,
                cashierId: data.cashierId
            }
        });

        // 3. Auto-Create Adjustment Expense (Z-Report Logic)
        if (Math.abs(adjustmentAmount) > 0.01) {
            let desc = "";
            if (adjustmentAmount > 0) {
                desc = `Otomatik Kasa Açığı (Z-Raporu)`; // Shortage
            } else {
                desc = `Otomatik Kasa Fazlası (Z-Raporu)`; // Overage
            }

            if (data.note) desc += ` - Not: ${data.note}`;

            await db.storeExpense.create({
                data: {
                    amount: adjustmentAmount, // 50 or -50
                    description: desc,
                    storeId: data.storeId
                }
            });
        }

        revalidatePath("/dashboard/pos");
        return { success: true };
    } catch (error: any) {
        console.error("Cash Closing Error:", error);
        return { success: false, error: "Kasa sayımı kaydedilemedi: " + (error.message || error) };
    }
}

export async function getDailyCashClosings(storeId: string) {
    if (!storeId) return [];

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const closings = await db.cashRegisterClosing.findMany({
        where: {
            storeId,
            createdAt: {
                gte: start,
                lte: end
            }
        },
        include: {
            cashier: { select: { name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return closings.map(c => ({
        id: c.id,
        coutedCash: Number(c.countedCash),
        difference: c.cashDifference ? Number(c.cashDifference) : null,
        note: c.note,
        createdAt: c.createdAt,
        cashierName: c.cashier.name || c.cashier.username
    }));
}
