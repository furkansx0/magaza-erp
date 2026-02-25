"use server"

import { db } from "@/lib/db"
import { generateNextBarcodes } from "@/actions/inventory/barcode-actions";
import { revalidatePath } from "next/cache";

const BRANDS = {
    Ayakkabı: ["Greyder", "Mammamia", "Scooter", "LumberJack", "Guja", "Adidas", "Nike"],
    Giyim: ["Twister", "Brango"],
    Çanta: ["Golden Polo"]
};

const COLORS = ["Siyah", "Beyaz", "Lacivert", "Kırmızı", "Gri", "Haki", "Taba", "Vizon", "Bej", "Yeşil"];
const SIZES_SHOE = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
const SIZES_TEXTILE = ["XS", "S", "M", "L", "XL", "XXL"];
const ADJECTIVES = ["Rahat", "Spor", "Klasik", "Günlük", "Outdoor", "Yazlık", "Kışlık", "Deri", "Kumaş", "Air"];

function getRandom(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedProductsBatch(batchSize: number, storeIds: string[]) {
    try {
        // Pre-generate barcodes
        const barcodeRes = await generateNextBarcodes(batchSize);
        if (!barcodeRes.success || !barcodeRes.barcodes) {
            throw new Error("Barkod üretilemedi");
        }
        const barcodes = barcodeRes.barcodes;
        let barcodeIndex = 0;

        await db.$transaction(async (tx) => {
            for (let i = 0; i < batchSize; i++) {
                // 1. Pick Category & Brand
                const categories = Object.keys(BRANDS);
                const category = getRandom(categories);
                const brand = getRandom((BRANDS as any)[category]);
                const color = getRandom(COLORS);
                const gender = getRandom(["Erkek", "Kadın", "Unisex"]);

                let size = "STD";
                if (category === "Ayakkabı") size = getRandom(SIZES_SHOE);
                else if (category === "Giyim") size = getRandom(SIZES_TEXTILE);

                const adjective = getRandom(ADJECTIVES);
                const modelName = `${brand} ${color} ${adjective} ${category}`;

                // 2. Create Model (check existing to reuse? For now create new implies distinct models mostly, 
                // but let's try to reuse models to resemble real data where one model has variants)
                // Actually, for 5000 items, let's create random models. 
                // To be realistic: A model usually has multiple sizes. 
                // But simplified: 1 row = 1 variant for speed.

                // Let's create a model for this iteration
                const model = await tx.productModel.create({
                    data: {
                        name: modelName,
                        brand: brand,
                        category: category,
                        season: "2024 Test",
                        gender: gender,
                        description: "Otomatik test ürünü"
                    }
                });

                // 3. Create Variant
                const purchasePrice = randomInt(500, 3000);
                const salePrice = purchasePrice + randomInt(200, 1000);
                const barcode = barcodes[barcodeIndex++];

                // SKU: BRAND-CATEGORY-RANDOM
                const sku = `${brand.substring(0, 3)}-${category.substring(0, 3)}-${randomInt(10000, 99999)}`.toUpperCase();

                const variant = await tx.productVariant.create({
                    data: {
                        modelId: model.id,
                        color: color,
                        size: size,
                        sku: sku,
                        barcode: String(barcode),
                        purchasePrice: purchasePrice,
                        salePrice: salePrice
                    }
                });

                // 4. Create Stocks
                for (const storeId of storeIds) {
                    await tx.stock.create({
                        data: {
                            storeId: storeId,
                            variantId: variant.id,
                            quantity: randomInt(0, 50)
                        }
                    });
                }
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Seed Error:", error);
        return { success: false, error: error.message };
    }
}

// Sales Seeding
const NAMES = ["Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Veli", "Zeynep", "Elif", "Mustafa", "Can"];
const SURNAMES = ["Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Özdemir", "Arslan", "Doğan", "Kılıç"];
const PAYMENT_METHODS = ["Nakit", "Kredi Kartı", "Havale"];

// ... (imports remain)

// Enhanced Sales Seeding
export async function seedSales(count: number, storeIdOverride: string = "mixed") {
    try {
        const variants = await db.productVariant.findMany({
            take: 200,
            where: { isArchived: false } as any, // Only active if field exists, else ignore
            select: { id: true, salePrice: true, model: { select: { name: true } } }
        });
        if (variants.length === 0) return { success: false, error: "Önce ürün eklemelisiniz." };

        // Fetch all active stores if 'mixed', else specific
        let targetStores: any[] = [];
        if (storeIdOverride === "mixed") {
            targetStores = await db.store.findMany({ include: { users: true } });
        } else {
            targetStores = await db.store.findMany({ where: { id: storeIdOverride }, include: { users: true } });
        }
        if (targetStores.length === 0) return { success: false, error: "Mağaza bulunamadı." };

        // Pre-fetch some customers to mix new/existing?
        // User said "test müşteri ata" separately, implies creating new ones.
        // But for sales, let's mix existing if any, or create some.
        // Let's create a pool of customers first or on fly.
        // User said "karışık mağazalarda karışık personeller üzerinden karışık tarihli satışlar ata"
        // Also "test müşteri ata" is a separate button? Or does he mean "assign sales TO test customers"?
        // "test müşteri ata" -> likely "Create Test Customers".
        // "test ürün ata" -> "Create Test Products".
        // "test oto karışık... satışlar ata" -> Create Sales.

        // We'll create random customers on the fly for these sales to ensure volume, or pick existing.
        // Let's create a batch of customers first if count is high?
        // For simplicity: Create 1 customer per sale OR pick random existing.
        // Let's pick random existing if available to simulate returning customers, otherwise create new.
        const existingCustomers = await db.customer.findMany({ select: { id: true }, take: 100 });

        await db.$transaction(async (tx) => {
            for (let i = 0; i < count; i++) {
                // 1. Context: Store & Cashier
                const store = getRandom(targetStores);
                const cashier = store.users.length > 0 ? getRandom(store.users) : null;
                if (!cashier) continue; // Skip if no staff in store

                // 2. Customer
                let customerId;
                // 50% chance to use existing customer if available
                if (existingCustomers.length > 0 && Math.random() > 0.5) {
                    customerId = getRandom(existingCustomers).id;
                } else {
                    const name = getRandom(NAMES);
                    const surname = getRandom(SURNAMES);
                    const c = await tx.customer.create({
                        data: {
                            name: `${name} ${surname}`,
                            phone: `05${randomInt(10, 99)} ${randomInt(100, 999)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
                            email: `test${randomInt(1, 99999)}@test.com`
                        }
                    });
                    customerId = c.id;
                    if (existingCustomers.length < 100) existingCustomers.push({ id: c.id });
                }

                // 3. Date (Past 90 days)
                const daysBack = randomInt(0, 90);
                const date = new Date();
                date.setDate(date.getDate() - daysBack);
                // Random time
                date.setHours(randomInt(9, 21), randomInt(0, 59));

                // 4. Items
                const itemCount = randomInt(1, 4);
                let totalAmount = 0;
                const saleItemsData = [];
                for (let k = 0; k < itemCount; k++) {
                    const variant = getRandom(variants);
                    const qty = randomInt(1, 3);
                    const price = Number(variant.salePrice);
                    totalAmount += price * qty;
                    saleItemsData.push({
                        variantId: variant.id,
                        quantity: qty,
                        price: price
                    });
                }

                // 5. Create Sale
                const sale = await tx.sale.create({
                    data: {
                        storeId: store.id,
                        customerId: customerId,
                        cashierId: cashier.id,
                        totalAmount: totalAmount,
                        createdAt: date, // Override date
                        items: { create: saleItemsData }
                    }
                });

                // 6. Payments (Mixed)
                // Randomly split or single? User said "karışık ödeme yöntemli"
                const methods = ["CASH", "CREDIT_CARD", "GIFT_CARD"];
                const selectedMethod = getRandom(methods);

                let giftCardId = undefined;

                if (selectedMethod === "GIFT_CARD") {
                    // Create a dummy gift card for this transaction to be valid
                    const code = "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase();
                    const gc = await tx.giftCard.create({
                        data: {
                            code: code,
                            type: "FIXED_AMOUNT",
                            initialAmount: totalAmount,
                            remainingBalance: 0, // Used completely
                            customerId: customerId,
                            expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                            isActive: true
                        }
                    });
                    giftCardId = gc.id;
                }

                await tx.salePayment.create({
                    data: {
                        saleId: sale.id,
                        amount: totalAmount,
                        method: selectedMethod,
                        giftCardId: giftCardId,
                        createdAt: date
                    }
                });
            }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error: any) {
        console.error("Seed Sales Error:", error);
        return { success: false, error: error.message };
    }
}

export async function seedGiftCards(count: number) {
    try {
        const customers = await db.customer.findMany({ select: { id: true }, take: 50 });
        if (customers.length === 0) return { success: false, error: "Önce müşteri oluşturmalısınız." };

        await db.$transaction(async (tx) => {
            for (let i = 0; i < count; i++) {
                const customer = getRandom(customers);
                const isPercentage = Math.random() > 0.7; // 30% percentage cards
                const amount = isPercentage ? 0 : randomInt(100, 1000);
                const percent = isPercentage ? randomInt(5, 50) : null;

                const crypto = require("crypto");
                const code = "GIFT" + crypto.randomBytes(3).toString("hex").toUpperCase();

                await tx.giftCard.create({
                    data: {
                        code: code,
                        type: isPercentage ? "PERCENTAGE" : "FIXED_AMOUNT",
                        initialAmount: isPercentage ? null : amount,
                        remainingBalance: isPercentage ? null : amount,
                        percentage: percent,
                        customerId: customer.id,
                        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                        isActive: true
                    }
                });
            }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error: any) {
        console.error("Seed GC Error:", error);
        return { success: false, error: error.message };
    }
}

// Helper to Create Just Customers
export async function seedCustomers(count: number) {
    try {
        await db.$transaction(async (tx) => {
            for (let i = 0; i < count; i++) {
                const name = getRandom(NAMES);
                const surname = getRandom(SURNAMES);
                await tx.customer.create({
                    data: {
                        name: `${name} ${surname}`,
                        phone: `05${randomInt(10, 99)} ${randomInt(100, 999)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
                        email: `test${randomInt(1, 99999)}@example.com`,
                        address: "Otomatik Test Adresi"
                    }
                });
            }
        })
        revalidatePath("/dashboard");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
