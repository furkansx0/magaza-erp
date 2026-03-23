import { Prisma } from "@prisma/client";

export interface ActivityRow {
    id: string
    docNo: string
    type: string
    description: string
    staff: string
    total: number
    cash: number
    creditCard: number
    giftCard: number
    date: string
    time: string
    createdAt: Date
}

export type DateRangeType = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "last6Months" | "last30Days" | "custom";
export type ActivityTypeFilter = "ALL" | "SALE" | "EXCHANGE" | "RETURN";

export type ProductWithVariants = Prisma.ProductModelGetPayload<{
    include: {
        variants: {
            include: { stocks: true }
        }
    }
}>;

export interface StockResult {
    storeName: string;
    stock: number;
}

export interface ProductStockInfo {
    variantId: string;
    productName: string;
    description: string;
    barcode: string;
    stocks: StockResult[];
}

export type TransferItem = {
    variantId: string;
    barcode: string;
    modelName: string;
    price: number;
    quantity: number;
}

export type ValidatedProduct = {
    variantId: string
    barcode: string
    name: string
    modelName: string
    color: string
    size: string
    stock: number
    image?: string
}

export interface ReportSummary {
    totalRevenue: number
    totalCost: number
    totalProfit: number
    totalSalesCount: number
    averageBasket: number
}

export interface ChartData {
    date: string
    revenue: number
    profit: number
    count: number
}
