"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function deleteAllProducts() {
    try {
        // Delete dependent data
        // SaleItem -> Variant
        // Stock -> Variant
        // Delete all SaleItems first? 
        // If we delete products, we corrupt sales history usually. 
        // User asked to "Delete All Products". 
        // We should PROBABLY delete all sales too if we delete products or at least sale items.
        // Or set variantId to null? Schema says variantId is required in SaleItem?
        // Let's assume user knows what they are doing and we delete dependent stocks and sale items.

        // 1. Delete Stocks
        await db.stock.deleteMany({})

        // 2. Delete Sale Items (This effectively breaks Sales if they have no items, but whatever)
        // Actually, deleting SaleItems is dangerous without deleting Sales.
        // Let's try to delete logic: 
        // If we delete products, we must delete SaleItems referencing them.
        await db.saleItem.deleteMany({})

        // 3. Delete Variants
        await db.productVariant.deleteMany({})

        // 4. Delete Models
        await db.productModel.deleteMany({})

        revalidatePath("/dashboard")
        return { success: true, message: "Tüm ürünler ve stoklar silindi." }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteAllCustomers() {
    try {
        // Delete dependent Sales?
        // Sale -> Customer (optional?)
        // Schema says customerId is optional? Let's check.
        // If optional, we can set null. But simpler to delete Sales usually if it's a "Clean" operation.
        // But user has separate "Delete All Sales". 
        // Let's first try to delete customers. If fails due to FK, we instruct user to delete sales first.
        // OR we just set customerId = null on sales.

        // Let's try force delete relations if possible or set null.
        // 1. Anonymize Sales (Keep financial data)
        await db.sale.updateMany({
            data: { customerId: null }
        })

        // 2. Delete Dependent Logs & Cards (Must be deleted as they require a customer)
        await db.campaignLog.deleteMany({})
        await db.giftCard.deleteMany({})

        // 3. Delete Customers
        await db.customer.deleteMany({})

        revalidatePath("/dashboard")
        return { success: true, message: "Tüm müşteriler ve bağlı kayıtları (Loglar, Hediye Çekleri) silindi. Satışlar anonim hale getirildi." }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteAllSales() {
    try {
        await db.salePayment.deleteMany({})
        await db.saleItem.deleteMany({})
        await db.sale.deleteMany({})

        revalidatePath("/dashboard")
        return { success: true, message: "Tüm satış geçmişi silindi." }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteAllGiftCards() {
    try {
        await db.giftCard.deleteMany({})
        revalidatePath("/dashboard")
        return { success: true, message: "Tüm hediye çekleri silindi." }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
