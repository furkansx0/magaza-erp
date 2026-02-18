
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database with VARIANTS...')

    // Create Stores
    const store1 = await prisma.store.create({
        data: { name: 'Merkez Şube', location: 'İstanbul/Kadıköy', phone: '0216 123 45 67' }
    })

    const store2 = await prisma.store.create({
        data: { name: 'Şube 2', location: 'İstanbul/Beşiktaş', phone: '0212 987 65 43' }
    })

    // Create Sample T-Shirt Model (Detailed)
    const tshirtModel = await prisma.productModel.create({
        data: {
            name: 'Basic Slim T-Shirt',
            description: '%100 Pamuk, Dar Kesim',
            brand: 'Mavi',
            category: 'T-Shirt',
            gender: 'Erkek',
            season: '2025 Yaz'
        }
    })

    // Create Variants for T-Shirt (Red S, Red M, etc.)
    const variants = [
        { color: 'Kırmızı', size: 'S', barcode: 'TSHRT-RED-S-001', price: 299.90 },
        { color: 'Kırmızı', size: 'M', barcode: 'TSHRT-RED-M-002', price: 299.90 },
        { color: 'Kırmızı', size: 'L', barcode: 'TSHRT-RED-L-003', price: 299.90 },
        { color: 'Mavi', size: 'S', barcode: 'TSHRT-BLU-S-004', price: 299.90 },
        { color: 'Mavi', size: 'M', barcode: 'TSHRT-BLU-M-005', price: 299.90 },
    ]

    for (const v of variants) {
        const variant = await prisma.productVariant.create({
            data: {
                modelId: tshirtModel.id,
                color: v.color,
                size: v.size,
                barcode: v.barcode,
                purchasePrice: 150.00,
                salePrice: v.price,
                sku: `${tshirtModel.name.substring(0, 3)}-${v.color.substring(0, 3)}-${v.size}`.toUpperCase()
            }
        })

        // Add random stock
        await prisma.stock.create({
            data: { variantId: variant.id, storeId: store1.id, quantity: Math.floor(Math.random() * 50) + 10 }
        })
    }

    // Create Sample Shoe Model
    const shoeModel = await prisma.productModel.create({
        data: {
            name: 'Koşu Ayakkabısı Pro 5',
            brand: 'Nike',
            category: 'Ayakkabı',
            gender: 'Kadın',
            season: '2024 Tüm Yıl'
        }
    })

    // Shoe Variants (Sizes 36-38)
    for (let size = 36; size <= 40; size++) {
        const variant = await prisma.productVariant.create({
            data: {
                modelId: shoeModel.id,
                color: 'Pembe/Siyah',
                size: size.toString(),
                barcode: `SHOE-PNK-${size}`,
                purchasePrice: 2000.00,
                salePrice: 3499.00,
                sku: `NIKE-PRO5-${size}`
            }
        })

        await prisma.stock.create({
            data: { variantId: variant.id, storeId: store1.id, quantity: Math.floor(Math.random() * 10) }
        })
    }

    console.log('Advanced Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
