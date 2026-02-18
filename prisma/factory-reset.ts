import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🧹 Factory Reset Started...")

    // Delete in order of dependencies (child first, then parent)

    // 1. Transactional Data
    await prisma.saleItem.deleteMany()
    await prisma.sale.deleteMany()
    await prisma.stock.deleteMany()

    // 2. Product Data
    await prisma.productVariant.deleteMany()
    await prisma.productModel.deleteMany()

    // 3. Customer Data
    await prisma.customer.deleteMany()

    // 4. Organizational Data (Stores & Users)
    // Note: Users depend on Stores (sometimes) or vice versa if we had manager links.
    // Our schema: User has storeId. Store has no User FK (only relation array).
    // So delete Users first.
    await prisma.user.deleteMany()
    await prisma.store.deleteMany()

    console.log("✨ All data cleared! System is fresh.")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
