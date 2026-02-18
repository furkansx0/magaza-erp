"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const STORE_NAMES = ["Merkez Şube", "AVM Mağaza", "Cadde Mağaza"]
const USER_NAMES = ["Ahmet Yılmaz", "Ayşe Demir", "Mehmet Kaya", "Fatma Çelik"]
const BRANDS = ["Nike", "Adidas", "Puma", "Mavi", "Zara"]
const CATEGORIES = ["Giyim", "Ayakkabı", "Aksesuar"]
const SUB_CATEGORIES = ["T-Shirt", "Pantolon", "Ceket", "Spor Ayakkabı", "Bot"]
const COLORS = ["Siyah", "Beyaz", "Kırmızı", "Mavi", "Yeşil"]
const SIZES = ["XS", "S", "M", "L", "XL", "36", "38", "40", "42"]
const CUSTOMER_NAMES = [
    "Ali Veli", "Zeynep Sönmez", "Burak Yılmaz", "Elif Demir", "Canan Karatay",
    "Murat Boz", "Oğuzhan Koç", "Seda Sayan", "Acun Ilıcalı", "Hadise Açıkgöz"
]

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper to generate a random past date within last N days
function getRandomDate(daysBack: number) {
    const date = new Date()
    date.setDate(date.getDate() - getRandomInt(0, daysBack))
    // Random time
    date.setHours(getRandomInt(9, 21), getRandomInt(0, 59), 0)
    return date
}

export async function generateRandomData() {
    try {
        console.log("Starting random data generation...")

        // 1. Create Stores
        const stores = []
        for (const name of STORE_NAMES) {
            // Try to find existing first to avoid duplicates if run multiple times
            let store = await prisma.store.findFirst({ where: { name } })
            if (!store) {
                store = await prisma.store.create({
                    data: {
                        name,
                        code: name.substring(0, 3).toUpperCase() + "-" + getRandomInt(100, 999),
                        type: "STORE",
                        location: "İstanbul"
                    }
                })
            }
            stores.push(store)
        }

        // 2. Create Users (Cashiers)
        const users = []
        for (const store of stores) {
            for (let i = 0; i < 2; i++) {
                const name = getRandomItem(USER_NAMES)
                const username = name.toLowerCase().replace(" ", "") + getRandomInt(1, 999)
                // Check if exists
                let user = await prisma.user.findUnique({ where: { username } })
                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            username,
                            password: "123", // Dummy password
                            name,
                            role: "CASHIER",
                            storeId: store.id
                        }
                    })
                }
                users.push(user)
            }
        }

        // 3. Create Products & Variants
        const variants = []
        for (let i = 0; i < 10; i++) {
            const brand = getRandomItem(BRANDS)
            const category = getRandomItem(CATEGORIES)
            const subCategory = getRandomItem(SUB_CATEGORIES)
            const modelName = `${brand} ${subCategory} ${getRandomInt(100, 999)}`

            const model = await prisma.productModel.create({
                data: {
                    name: modelName,
                    brand,
                    category,
                    subCategory,
                    gender: getRandomItem(["Erkek", "Kadın", "Unisex"]),
                    season: "2024 Yaz",
                    modelCode: "MDL" + getRandomInt(1000, 9999),
                    attributes: JSON.stringify({ material: "Pamuk" })
                }
            })

            // Create 3-5 variants per model
            const numVariants = getRandomInt(3, 5)
            for (let j = 0; j < numVariants; j++) {
                const color = getRandomItem(COLORS)
                const size = getRandomItem(SIZES)
                const barcode = "869" + getRandomInt(1000000000, 9999999999) // Simple EAN13 sim

                // Check barcode unique
                const output = await prisma.productVariant.upsert({
                    where: { barcode },
                    update: {},
                    create: {
                        modelId: model.id,
                        barcode,
                        sku: `${model.modelCode}-${color}-${size}`.toUpperCase(),
                        color,
                        size,
                        purchasePrice: getRandomInt(100, 500),
                        salePrice: getRandomInt(600, 1500),
                        secondPrice: getRandomInt(500, 1400),
                    }
                })
                variants.push(output)
            }
        }

        // 4. Create Initial Stock
        // Ensure every variant has stock in every store
        for (const store of stores) {
            for (const variant of variants) {
                const quantity = getRandomInt(10, 100)
                await prisma.stock.upsert({
                    where: {
                        variantId_storeId: {
                            storeId: store.id,
                            variantId: variant.id
                        }
                    },
                    update: { quantity }, // Reset or just ensure? Let's strict set
                    create: {
                        storeId: store.id,
                        variantId: variant.id,
                        quantity
                    }
                })

                // Log initial movement (optional but good for history)
                // Skipping for brevity, assuming standard "Opening Stock" logic handled elsewhere or ignored here
            }
        }

        // 5. Create Customers
        const customers = []
        for (const name of CUSTOMER_NAMES) {
            let customer = await prisma.customer.findFirst({ where: { name } })
            if (!customer) {
                customer = await prisma.customer.create({
                    data: {
                        name,
                        phone: "05" + getRandomInt(100000000, 999999999),
                        email: name.toLowerCase().replace(" ", ".") + "@example.com",
                        type: Math.random() > 0.8 ? "CORPORATE" : "INDIVIDUAL",
                        city: "İstanbul"
                    }
                })
            }
            customers.push(customer)
        }

        // 6. Generate Sales (Last 30 Days)
        // Create ~50 random sales
        for (let i = 0; i < 50; i++) {
            const store = getRandomItem(stores)
            const cashier = getRandomItem(users.filter(u => u.storeId === store.id) || users) // Fallback to any user if filter empty
            const customer = Math.random() > 0.3 ? getRandomItem(customers) : null

            const date = getRandomDate(30)

            // 1-4 items per sale
            const numItems = getRandomInt(1, 4)
            const saleItemsData = []
            let totalAmount = 0

            for (let k = 0; k < numItems; k++) {
                const variant = getRandomItem(variants)
                const qty = getRandomInt(1, 2)
                const price = Number(variant.salePrice) // Decimal to number for calc

                saleItemsData.push({
                    variant,
                    quantity: qty,
                    price
                })
                totalAmount += (qty * price)
            }

            // Create Sale
            const sale = await prisma.sale.create({
                data: {
                    storeId: store.id,
                    cashierId: cashier.id,
                    customerId: customer?.id,
                    totalAmount: totalAmount,
                    createdAt: date,
                    paymentMethod: "CASH", // Default
                    // Create Items
                    items: {
                        create: saleItemsData.map(item => ({
                            variantId: item.variant.id,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    },
                    // Create Payment (Simple single payment for now to avoid decimal math headaches)
                    payments: {
                        create: {
                            amount: totalAmount,
                            method: Math.random() > 0.5 ? "CREDIT_CARD" : "CASH"
                        }
                    }
                },
                include: { items: true }
            })

            // UPDATE STOCK & CREATE MOVEMENTS
            for (const item of saleItemsData) {
                // Decrement Stock
                const stock = await prisma.stock.findUnique({
                    where: {
                        variantId_storeId: {
                            storeId: store.id,
                            variantId: item.variant.id
                        }
                    }
                })

                if (stock) {
                    const newQty = stock.quantity - item.quantity
                    await prisma.stock.update({
                        where: { id: stock.id },
                        data: { quantity: newQty }
                    })

                    // Add Movement
                    await prisma.stockMovement.create({
                        data: {
                            storeId: store.id,
                            variantId: item.variant.id,
                            type: "SALE",
                            quantity: -item.quantity,
                            balanceAfter: newQty,
                            referenceId: sale.id,
                            createdAt: date // Match sale date
                        }
                    })
                }
            }
        }

        console.log("Random data generation completed successfully!")
        revalidatePath("/")
        return { success: true, message: "Rastgele veriler başarıyla oluşturuldu." }

    } catch (error) {
        console.error("Error generating data:", error)
        return { success: false, error: String(error) }
    }
}

export async function clearDemoData() {
    try {
        console.log("Starting demo data cleanup...")

        // 1. Identify Demo Stores
        const demoStores = await prisma.store.findMany({
            where: { name: { in: STORE_NAMES } }
        })
        const demoStoreIds = demoStores.map(s => s.id)

        if (demoStoreIds.length === 0) {
            return { success: true, message: "Temizlenecek demo verisi bulunamadı." }
        }

        // 2. Delete All Sales & Stock Movements related to Demo Stores
        // Delete SaleItems first (Cascade might assume, but let's be explicit/safe)
        // Actually Prisma Cascade handles most if we delete the Sale, but let's see schema.
        // SaleItem -> Sale (Cascade optional?)
        // Let's rely on deleting the Sale.

        // Delete Movements in Demo Stores
        await prisma.stockMovement.deleteMany({
            where: { storeId: { in: demoStoreIds } }
        })

        // Delete Sales in Demo Stores
        // This will cascade delete SaleItems and SalePayments usually if configured, 
        // but if not, we might error. Assuming standard relation or manual delete.
        // Let's manually delete dependants to be safe if schema doesn't cascade.
        // Get sales to delete
        const sales = await prisma.sale.findMany({
            where: { storeId: { in: demoStoreIds } },
            select: { id: true }
        })
        const saleIds = sales.map(s => s.id)

        if (saleIds.length > 0) {
            await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } })
            await prisma.salePayment.deleteMany({ where: { saleId: { in: saleIds } } })
            await prisma.sale.deleteMany({ where: { id: { in: saleIds } } })
        }

        // 3. Delete Stocks in Demo Stores
        await prisma.stock.deleteMany({
            where: { storeId: { in: demoStoreIds } }
        })

        // 4. Delete Users in Demo Stores
        // Wait, what if I logged into one? NextAuth might complain if session user deletes self.
        // Assuming we are admin (not one of the demo users).
        await prisma.user.deleteMany({
            where: {
                username: { not: "admin" }, // just in case
                storeId: { in: demoStoreIds }
            }
        })

        // 5. Delete Customers (Only matching names)
        await prisma.customer.deleteMany({
            where: { name: { in: CUSTOMER_NAMES } }
        })

        // 6. Delete Demo Stores
        await prisma.store.deleteMany({
            where: { id: { in: demoStoreIds } }
        })

        // 7. Delete Products?
        // User said "Clean the garbage".
        // I will delete ProductModels that match the pattern AND have no stocks left?
        // Actually, deleting products is risky if they are used elsewhere.
        // But since we wiped stocks for these stores, if these products exist in OTHER stores, they are real.
        // If they don't exist in other stores, they are likely garbage.

        // Find variants that have NO stocks
        const variantsWithStock = await prisma.stock.findMany({
            select: { variantId: true },
            distinct: ['variantId']
        })
        const usedVariantIds = new Set(variantsWithStock.map(s => s.variantId))

        // Get all variants
        const allVariants = await prisma.productVariant.findMany({
            include: { model: true }
        })

        const variantsToDelete = allVariants.filter(v =>
            !usedVariantIds.has(v.id) && // No stocks anywhere
            BRANDS.includes(v.model.brand || "") && // Is one of our demo brands
            v.model.season === "2024 Yaz" // Is our demo season
        )

        const variantIdsToDelete = variantsToDelete.map(v => v.id)
        const modelIdsToCheck = new Set(variantsToDelete.map(v => v.modelId))

        if (variantIdsToDelete.length > 0) {
            // Delete variants
            await prisma.productVariant.deleteMany({
                where: { id: { in: variantIdsToDelete } }
            })
        }

        // Cleanup orphaned Models
        // Check if models have other variants?
        // Simpler: Just delete models that have no variants now.
        for (const mid of modelIdsToCheck) {
            const count = await prisma.productVariant.count({ where: { modelId: mid } })
            if (count === 0) {
                await prisma.productModel.delete({ where: { id: mid } })
            }
        }

        console.log("Demo data cleanup completed.")
        revalidatePath("/")
        return { success: true, message: "Demo verileri başarıyla temizlendi." }

    } catch (error) {
        console.error("Error clearing data:", error)
        return { success: false, error: String(error) }
    }
}
