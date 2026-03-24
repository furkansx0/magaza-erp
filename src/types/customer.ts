export interface AnalyticsData {
    ltv: number
    aov: number
    totalOrders: number
    returnRate: number
    lastVisitDate: Date | null
}

export interface SaleHistoryItem {
    id: string
    date: Date
    storeName: string
    totalAmount: number
    isReturn: boolean
    cashierName: string
    paymentMethods: {
        method: string
        amount: number
        giftCardId?: string
    }[]
    items: {
        id: string
        sku: string
        name: string
        variantName: string
        quantity: number
        originalPrice: number
        finalPrice: number
        isReturn: boolean
        salesRepName: string | null
    }[]
}

export interface MatrixData {
    topCategories: { name: string, count: number, percentage: number }[]
    favoriteColor: string
    favoriteSize: string
    favoriteBrand: string
    preferredStore: string
}
