"use server"

import { db } from "@/lib/db"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from "date-fns"
import { tr } from "date-fns/locale"

interface ReportSummary {
    totalRevenue: number
    totalCost: number
    totalProfit: number
    totalSalesCount: number
    averageBasket: number
}

interface ChartData {
    date: string
    revenue: number
    profit: number
    count: number
}

export async function getSalesReport(
    startDateStr?: string,
    endDateStr?: string,
    storeId?: string
): Promise<{ summary: ReportSummary, chartData: ChartData[] }> {

    // Default to this month if no date provided
    const start = startDateStr ? new Date(startDateStr) : startOfMonth(new Date());
    const end = endDateStr ? new Date(endDateStr) : endOfDay(new Date());

    // Ensure range covers full days
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

    // 1. Fetch Sales with Items and Variant (for Cost)
    const sales = await db.sale.findMany({
        where: whereClause,
        include: {
            items: {
                include: {
                    variant: {
                        select: { purchasePrice: true }
                    }
                }
            }
        },
        orderBy: { createdAt: 'asc' }
    });

    let totalRevenue = 0;
    let totalCost = 0;
    const dailyMap = new Map<string, { revenue: number, profit: number, count: number }>();

    // 2. Aggregate Data
    for (const sale of sales) {
        const saleRevenue = Number(sale.totalAmount);

        let saleCost = 0;
        for (const item of sale.items) {
            const cost = Number(item.variant.purchasePrice) * item.quantity;
            saleCost += cost;
        }

        const saleProfit = saleRevenue - saleCost;

        totalRevenue += saleRevenue;
        totalCost += saleCost;

        // Group by Day (YYYY-MM-DD)
        const dayKey = format(sale.createdAt, 'yyyy-MM-dd');

        if (!dailyMap.has(dayKey)) {
            dailyMap.set(dayKey, { revenue: 0, profit: 0, count: 0 });
        }

        const dayStats = dailyMap.get(dayKey)!;
        dayStats.revenue += saleRevenue;
        dayStats.profit += saleProfit;
        dayStats.count += 1;
    }

    const totalProfit = totalRevenue - totalCost;
    const totalSalesCount = sales.length;
    const averageBasket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

    // 3. Format Chart Data
    // Fill in missing days? For now just return days with sales or let frontend handle it.
    // Better to sort by date.
    const chartData: ChartData[] = Array.from(dailyMap.entries()).map(([date, stats]) => ({
        date,
        revenue: stats.revenue,
        profit: stats.profit,
        count: stats.count
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
        summary: {
            totalRevenue,
            totalCost,
            totalProfit,
            totalSalesCount,
            averageBasket
        },
        chartData
    };
}
