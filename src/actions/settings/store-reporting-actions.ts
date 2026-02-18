"use server"

import { prisma } from "@/lib/db"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, subMonths } from "date-fns"

export type DateRangeType = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "last6Months" | "custom";

interface DateRangeParams {
    range: DateRangeType;
    customStart?: Date;
    customEnd?: Date;
}

function getDateRange(params: DateRangeParams): { start: Date, end: Date } {
    const today = new Date();
    switch (params.range) {
        case "today":
            return { start: startOfDay(today), end: endOfDay(today) };
        case "yesterday":
            const y = subDays(today, 1);
            return { start: startOfDay(y), end: endOfDay(y) };
        case "thisWeek":
            return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfDay(today) };
        case "lastWeek":
            const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
            const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
            return { start: lastWeekStart, end: lastWeekEnd };
        case "thisMonth":
            return { start: startOfMonth(today), end: endOfDay(today) };
        case "lastMonth":
            const lastMonthStart = startOfMonth(subMonths(today, 1));
            const lastMonthEnd = endOfMonth(subMonths(today, 1));
            return { start: lastMonthStart, end: lastMonthEnd };
        case "last6Months":
            return { start: startOfMonth(subMonths(today, 6)), end: endOfDay(today) };
        case "custom":
            return {
                start: startOfDay(params.customStart || today),
                end: endOfDay(params.customEnd || today)
            };
        default:
            return { start: startOfDay(today), end: endOfDay(today) };
    }
}

// --- TAB 1: DASHBOARD ---

export async function getStoreDashboardStats(storeId: string) {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // 1. Fetch Today's Data (Full fetch for in-memory aggregation)
    const todaySalesData = await prisma.sale.findMany({
        where: {
            storeId,
            createdAt: { gte: start, lte: end }
        },
        include: {
            payments: true,
            items: {
                include: {
                    salesRep: { select: { id: true, name: true, username: true } }
                }
            },
            cashier: { select: { id: true, name: true, username: true } }
        }
    });

    const todayExpenses = await prisma.storeExpense.aggregate({
        where: {
            storeId,
            createdAt: { gte: start, lte: end }
        },
        _sum: { amount: true }
    });

    // --- AGGREGATION LOGIC ---

    let totalRevenue = 0;
    let activityCounts = { SALE: 0, RETURN: 0, EXCHANGE: 0 };
    let financeStats = { CASH: 0, CREDIT_CARD: 0, GIFT_CARD: 0 };
    const staffMap = new Map<string, { name: string, total: number, count: number }>();

    for (const sale of todaySalesData) {
        const amount = Number(sale.totalAmount);
        totalRevenue += amount;

        // Activity Type
        const hasNegativeItems = sale.items.some((i: any) => i.quantity < 0);
        let type: "SALE" | "RETURN" | "EXCHANGE" = "SALE";
        if (amount < 0) type = "RETURN";
        else if (hasNegativeItems) type = "EXCHANGE";
        activityCounts[type]++;

        // Finance
        for (const p of sale.payments) {
            const pAmount = Number(p.amount);
            if (p.method === "CASH") financeStats.CASH += pAmount;
            else if (p.method === "CREDIT_CARD") financeStats.CREDIT_CARD += pAmount;
            else if (p.method === "GIFT_CARD") financeStats.GIFT_CARD += pAmount;
        }

        // Staff Attribution (Per Item)
        for (const item of sale.items) {
            // Priority: Item Sales Rep -> Cashier
            const staff = item.salesRep || sale.cashier;
            if (staff && staff.id) {
                const itemTotal = Number(item.price) * item.quantity;
                const existing = staffMap.get(staff.id) || { name: staff.name || staff.username, total: 0, count: 0 };
                existing.total += itemTotal;
                existing.count += 1; // Count items or just sales involved? Let's sum revenue mainly.
                staffMap.set(staff.id, existing);
            }
        }
    }

    const staffStats = Array.from(staffMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5); // Top 5

    return {
        dashboardSummary: {
            todayRevenue: totalRevenue,
            todaySalesCount: todaySalesData.length,
            todayExpense: Number(todayExpenses._sum.amount || 0),
            activityCounts,
            financeStats,
            staffStats
        }
    };
}

// --- TAB 2: ACTIVITY REPORT ---

export type ActivityTypeFilter = "ALL" | "SALE" | "EXCHANGE" | "RETURN";

export async function getStoreActivityReport(
    storeId: string,
    dateParams: DateRangeParams,
    typeFilter: ActivityTypeFilter = "ALL"
) {
    const { start, end } = getDateRange(dateParams);

    const sales = await prisma.sale.findMany({
        where: {
            storeId,
            createdAt: { gte: start, lte: end }
        },
        include: {
            cashier: true, // Need full cashier for DetailDialog
            store: true, // Need store for DetailDialog
            customer: true, // Need customer for DetailDialog
            items: {
                include: {
                    variant: {
                        include: { model: true }
                    },
                    salesRep: { select: { name: true, username: true } }
                }
            },
            payments: {
                include: { giftCard: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Process and Filter Logic
    const activities = sales.map((sale: any) => {
        const hasNegativeItems = sale.items.some((i: any) => i.quantity < 0);
        const totalAmount = Number(sale.totalAmount);

        let type: ActivityTypeFilter = "SALE";
        if (totalAmount < 0) type = "RETURN"; // Full refund
        else if (hasNegativeItems) type = "EXCHANGE"; // Exchange or partial return

        return {
            ...sale, // Pass full sale object for SaleDetailDialog
            type, // Keep calculated type for Table Badge
            totalAmount,
            cashierName: sale.cashier.name,
            // Map items to include mapped SalesRepName, but KEEP variant structure
            items: sale.items.map((i: any) => ({
                ...i,
                price: Number(i.price),
                // Keep variant object as is for SaleDetailDialog
                salesRepName: i.salesRep?.name || i.salesRep?.username || null,
                variant: i.variant ? {
                    ...i.variant,
                    purchasePrice: Number(i.variant.purchasePrice),
                    salePrice: Number(i.variant.salePrice),
                    secondPrice: i.variant.secondPrice ? Number(i.variant.secondPrice) : null,
                } : null
            })),
            payments: sale.payments.map((p: any) => ({
                ...p,
                amount: Number(p.amount),
                giftCard: p.giftCard ? {
                    ...p.giftCard,
                    initialAmount: p.giftCard.initialAmount ? Number(p.giftCard.initialAmount) : null,
                    remainingBalance: p.giftCard.remainingBalance ? Number(p.giftCard.remainingBalance) : null,
                } : null
            }))
        };
    });

    if (typeFilter !== "ALL") {
        return activities.filter(a => a.type === typeFilter);
    }

    return activities;
}

// --- TAB 3: FINANCE REPORT ---

export async function getStoreFinanceReport(storeId: string, dateParams: DateRangeParams) {
    const { start, end } = getDateRange(dateParams);

    // 1. Payments Breakdown
    const payments = await prisma.salePayment.groupBy({
        by: ['method'],
        where: {
            sale: {
                storeId,
                createdAt: { gte: start, lte: end }
            }
        },
        _sum: { amount: true }
    });

    const paymentMap: Record<string, number> = {};
    let totalIncome = 0;

    payments.forEach(p => {
        const amount = Number(p._sum.amount || 0);
        paymentMap[p.method] = amount;
        totalIncome += amount;
    });

    // 2. Expenses
    const expenses = await prisma.storeExpense.findMany({
        where: {
            storeId,
            createdAt: { gte: start, lte: end }
        },
        orderBy: { createdAt: 'desc' }
    });

    const totalExpense = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

    // 3. Cash Flow (Cash In - Cash Out)
    // Assumes expenses are paid from CASH.
    // If expenses can be paid by other means, we need a method field on StoreExpense.
    // Assuming CASH for now as per typical retail request "Kasa Durumu".
    const cashIncome = paymentMap["CASH"] || 0;
    const netCash = cashIncome - totalExpense;

    return {
        paymentBreakdown: {
            cash: paymentMap["CASH"] || 0,
            creditCard: paymentMap["CREDIT_CARD"] || 0,
            giftCard: paymentMap["GIFT_CARD"] || 0,
            total: totalIncome
        },
        expenses: expenses.map(e => ({
            id: e.id,
            description: e.description,
            amount: Number(e.amount),
            createdAt: e.createdAt
        })),
        summary: {
            totalIncome,
            totalExpense,
            netCash, // Nakit Kalan (Devir hariç dönem içi)
            cashIncome
        }
    };
}

// --- TAB 4: STAFF REPORT ---

export async function getStoreStaffReport(storeId: string, dateParams: DateRangeParams) {
    const { start, end } = getDateRange(dateParams);

    // Fetch sales with items and their specific sales reps
    const sales = await prisma.sale.findMany({
        where: {
            storeId,
            createdAt: { gte: start, lte: end }
        },
        include: {
            cashier: { select: { id: true, name: true, username: true, /* @ts-ignore */ isArchived: true } },
            items: {
                include: {
                    salesRep: { select: { id: true, name: true, username: true, /* @ts-ignore */ isArchived: true } }
                }
            }
        }
    });

    const staffMap = new Map<string, {
        info: { id: string, name: string, username: string, isArchived: boolean },
        totalSales: number,
        totalItems: number,
        transactionCount: number,
        exchangeCount: number,
        participatedSaleIds: Set<string> // Track unique sales participated in
    }>();

    // Helper to init staff entry
    const getOrInitStaff = (staff: any) => {
        if (!staff || !staff.id) return null;
        if (!staffMap.has(staff.id)) {
            staffMap.set(staff.id, {
                info: staff,
                totalSales: 0,
                totalItems: 0,
                transactionCount: 0,
                exchangeCount: 0,
                participatedSaleIds: new Set()
            });
        }
        return staffMap.get(staff.id)!;
    };

    for (const sale of sales) {
        // Fallback: If for some reason items don't cover the total (legacy?), we might miss data.
        // But strict attribution means we look at items.

        // We'll iterate items to attribute revenue
        for (const item of sale.items) {
            // Determine who gets credit: Item Sales Rep > Sale Cashier
            // Actually, if salesRepId is set, it overrides. If NOT set, it falls back to cashier?
            // "Satış (POS) modülünde yapılan işlemlerin tüm personellere aynı (veya tek bir) kişi üzerinden kaydedilmesi hatasını düzelt."
            const targetStaff = item.salesRep || sale.cashier;

            const stats = getOrInitStaff(targetStaff);
            if (stats) {
                const amount = Number(item.price) * item.quantity;
                stats.totalSales += amount;
                stats.totalItems += Math.abs(item.quantity);

                // Track participation in this sale for transaction count
                stats.participatedSaleIds.add(sale.id);

                if (item.quantity < 0) {
                    stats.exchangeCount += 1; // Count each returned item line as an exchange/return action? 
                    // Or count unique sales with returns? 
                    // Let's keep existing logic: count specific negative actions
                }
            }
        }
    }

    return Array.from(staffMap.values()).map(s => ({
        ...s.info,
        totalSales: s.totalSales,
        totalItems: s.totalItems,
        transactionCount: s.participatedSaleIds.size, // Correct "Number of Sales involved in"
        exchangeCount: s.exchangeCount,
        averageBasket: s.participatedSaleIds.size > 0 ? s.totalSales / s.participatedSaleIds.size : 0
    }));
}

export async function getStaffSales(storeId: string, staffId: string, dateParams: DateRangeParams) {
    const { start, end } = getDateRange(dateParams);

    const sales = await prisma.sale.findMany({
        where: {
            storeId,
            createdAt: { gte: start, lte: end },
            OR: [
                { cashierId: staffId },
                { items: { some: { salesRepId: staffId } } }
            ]
        },
        include: {
            cashier: true,
            store: true,
            customer: true,
            items: {
                include: {
                    variant: {
                        include: { model: true }
                    },
                    salesRep: { select: { name: true, username: true } }
                }
            },
            payments: {
                include: { giftCard: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Reuse the exact same mapping logic from Activity Report for consistency
    return sales.map((sale: any) => {
        const hasNegativeItems = sale.items.some((i: any) => i.quantity < 0);
        const totalAmount = Number(sale.totalAmount);

        let type = "SALE";
        if (totalAmount < 0) type = "RETURN";
        else if (hasNegativeItems) type = "EXCHANGE";

        return {
            ...sale,
            type,
            totalAmount,
            cashierName: sale.cashier.name,
            items: sale.items.map((i: any) => ({
                ...i,
                price: Number(i.price),
                salesRepName: i.salesRep?.name || i.salesRep?.username || null,
                // Fix Decimal serialization for variant
                variant: i.variant ? {
                    ...i.variant,
                    purchasePrice: Number(i.variant.purchasePrice),
                    salePrice: Number(i.variant.salePrice),
                    secondPrice: i.variant.secondPrice ? Number(i.variant.secondPrice) : null,
                } : null
            })),
            payments: sale.payments.map((p: any) => ({
                ...p,
                amount: Number(p.amount),
                // Fix Decimal serialization for GiftCard
                giftCard: p.giftCard ? {
                    ...p.giftCard,
                    initialAmount: p.giftCard.initialAmount ? Number(p.giftCard.initialAmount) : null,
                    remainingBalance: p.giftCard.remainingBalance ? Number(p.giftCard.remainingBalance) : null,
                } : null
            }))
        };
    });
}
