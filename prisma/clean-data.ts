import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🗑️  Veriler temizleniyor...")

    try {
        // 1. Delete Sales Data
        console.log("- Satışlar siliniyor...")
        await prisma.saleItem.deleteMany({})
        await prisma.sale.deleteMany({})

        // 2. Delete Stock Data
        console.log("- Stoklar siliniyor...")
        await prisma.stock.deleteMany({})

        // 3. Delete Product Data
        console.log("- Ürünler siliniyor...")
        // Delete variants first (due to FK) or rely on cascade if configured, but manual is safer here
        await prisma.productVariant.deleteMany({})
        await prisma.productModel.deleteMany({})

        // Note: If there was a 'Product' table separate from Model/Variant, delete it too.
        // Based on previous reads, we use ProductModel mainly.
        // Checking schema showed ProductModel and ProductVariant.

        console.log("✅ Tüm satış ve ürün verileri başarıyla silindi.")
        console.log("ℹ️  Mağazalar ve Kullanıcılar KORUNDU.")

    } catch (e) {
        console.error("❌ Hata:", e)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
