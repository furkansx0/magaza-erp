"use server"

import { prisma } from "@/lib/db"
import { startOfDay, endOfDay, format } from "date-fns"

export interface ActivityRow {
    id: string
    docNo: string // Display ID
    type: string // "Satış", "İade"
    description: string
    staff: string
    total: number
    cash: number
    creditCard: number
    giftCard: number
    date: string // YYYY-MM-DD
    time: string // HH:mm
    createdAt: Date
}

export async function getActivityReport(
    startDateStr?: string,
    endDateStr?: string,
    storeId?: string
): Promise<{
    rows: ActivityRow[],
    stats: { total: number, cash: number, credit: number, gift: number }
}> {

    // Default to today if no date provided
    const start = startDateStr ? new Date(startDateStr) : new Date();
    const end = endDateStr ? new Date(endDateStr) : new Date();

    const from = startOfDay(start);
    const to = endOfDay(end);

    const whereClause: any = {
        createdAt: {
            gte: from,
            lte: to
        }
    }

    if (storeId && storeId !== "all") {
        whereClause.storeId = storeId;
    }

    // Fetch Sales with payments and relations
    const sales = await prisma.sale.findMany({
        where: whereClause,
        include: {
            cashier: { select: { name: true } },
            customer: { select: { name: true, type: true } },
            payments: true
        },
        orderBy: { createdAt: 'desc' }
    });

    const rows: ActivityRow[] = [];
    let totalSum = 0;
    let cashSum = 0;
    let creditSum = 0;
    let giftSum = 0;

    for (const sale of sales) {
        let cash = 0;
        let credit = 0;
        let gift = 0;

        // Sum payments by type
        // Note: Basic `Sale` model might have `paymentMethod` (legacy) if `payments` (new) is empty.
        // We check `payments` array first as per new design.
        if (sale.payments && sale.payments.length > 0) {
            for (const p of sale.payments) {
                const amt = Number(p.amount);
                if (p.method === 'CASH') cash += amt;
                else if (p.method === 'CREDIT_CARD') credit += amt;
                else if (p.method === 'GIFT_CARD') gift += amt;
            }
        } else {
            // Fallback for old data without split payments
            const amt = Number(sale.totalAmount);
            if (sale.paymentMethod === 'CASH') cash = amt;
            else if (sale.paymentMethod === 'CREDIT_CARD') credit = amt;
            else if (sale.paymentMethod === 'GIFT_CARD') gift = amt;
            else cash = amt; // Default
        }

        const total = Number(sale.totalAmount);

        rows.push({
            id: sale.id,
            docNo: sale.id.substring(0, 8).toUpperCase(), // Short ID
            type: "Satış", // TODO: Detect Returns if we have them
            description: sale.customer ? sale.customer.name : "Perakende Müşteri",
            staff: sale.cashier?.name || "Bilinmiyor",
            total: total,
            cash: cash,
            creditCard: credit,
            giftCard: gift,
            date: format(sale.createdAt, "dd.MM.yyyy"),
            time: format(sale.createdAt, "HH:mm"),
            createdAt: sale.createdAt
        });

        totalSum += total;
        cashSum += cash;
        creditSum += credit;
        giftSum += gift;
    }

    return {
        rows,
        stats: {
            total: totalSum,
            cash: cashSum,
            credit: creditSum,
            gift: giftSum
        }
    };
}
