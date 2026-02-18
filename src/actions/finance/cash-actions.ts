"use server"

import { db } from "@/lib/db"

// Calculates the current Expected Cash in the Drawer
// Formula: (Total Cash Sales) - (Total Expenses)
// Note: This assumes a continuous ledger. If we want "Daily" only, we'd filter by date.
// User requested: "Olması Gereken Nakit = (Bir Önceki Gün Devri + Bugünkü Nakit Satışlar) - (Bugünkü Toplam Giderler)"
// Which mathematically equals "Total In - Total Out" from the beginning of time (assuming Start=0).
// Because "Previous Day Carryover" is just "Total In - Total Out" up to yesterday.
export async function getStoreCashBalance(storeId: string) {
    if (!storeId) return { balance: 0, error: null };

    try {
        // 1. Sum of all CASH sales
        const salesAgg = await db.salePayment.aggregate({
            _sum: { amount: true },
            where: {
                method: "CASH",
                sale: { storeId: storeId }
            }
        });

        // 2. Sum of all Expenses
        const expensesAgg = await db.storeExpense.aggregate({
            _sum: { amount: true },
            where: { storeId: storeId }
        });

        const totalCashIn = Number(salesAgg._sum.amount || 0);
        const totalCashOut = Number(expensesAgg._sum.amount || 0);

        const currentBalance = totalCashIn - totalCashOut;

        return { balance: currentBalance, success: true };

    } catch (error: any) {
        console.error("Balance Calc Error:", error);
        return { balance: 0, error: "Bakiye hesaplanamadı." };
    }
}
