
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Starting Large Scale Seed...')

    const BRANDS = ["Nike", "Adidas", "Puma", "Greyder", "Timberland", "Sketchers", "New Balance", "Reebok", "Vans", "Converse", "Under Armour", "Salomon", "The North Face", "Columbia", "Jack Wolfskin", "Merrell", "Dockers", "Lumberjack", "Hummel", "Kinetix"]
    const CATEGORIES = ["Ayakkabı", "Bot", "Terlik", "Sandalet"]
    const SUBCATEGORIES = ["Koşu", "Yürüyüş", "Basketbol", "Futbol", "Klasik", "Günlük", "Outdoor", "Training"]
    const COLORS = ["Siyah", "Beyaz", "Gri", "Lacivert", "Kırmızı", "Mavi", "Yeşil", "Sarı", "Turuncu", "Kahverengi", "Bej", "Haki", "Taba", "Bordo", "Pembe"]
    const SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]
    const MATERIALS = ["Deri", "Süet", "Nubuk", "Tekstil", "Sentetik", "File", "Kanvas", "Goretex"]
    const SEASONS = ["2024 Yaz", "2024 Kış", "2025 Yaz", "2025 Kış", "4 Mevsim"]

    // Get stores to assign stock
    const stores = await prisma.store.findMany()
    if (stores.length === 0) {
        console.log("No stores found. Creating defaults...")
        await prisma.store.createMany({
            data: [
                { name: "Merkez Depo", type: "WAREHOUSE", code: "DEP-001" },
                { name: "Kadıköy Mağaza", type: "STORE", code: "IST-001" },
                { name: "Beşiktaş Mağaza", type: "STORE", code: "IST-002" }
            ]
        })
    }
    const allStores = await prisma.store.findMany()

    // Generate 200 Models -> ~6600 Variants
    const MODELS_COUNT = 200;

    for (let i = 0; i < MODELS_COUNT; i++) {
        const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)]
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
        const subCategory = SUBCATEGORIES[Math.floor(Math.random() * SUBCATEGORIES.length)]
        const gender = Math.random() > 0.5 ? "Erkek" : "Kadın"

        // Attributes
        const material = MATERIALS[Math.floor(Math.random() * MATERIALS.length)]
        const season = SEASONS[Math.floor(Math.random() * SEASONS.length)]
        const style = Math.random() > 0.5 ? "Bağcıklı" : "Bağcıksız"

        const attributes = {
            material,
            season,
            style,
            lining: Math.random() > 0.7 ? "Yünlü" : "Standart",
            waterproof: Math.random() > 0.8 ? "Evet" : "Hayır"
        }

        const modelName = `${brand} ${gender} ${category} ${subCategory} ${i + 100}`

        const model = await prisma.productModel.create({
            data: {
                name: modelName,
                brand,
                gender,
                category,
                subCategory,
                // Using attributes JSON
                attributes: JSON.stringify(attributes)
            }
        })

        // Create Variants (Colors)
        const randomColors = COLORS.sort(() => 0.5 - Math.random()).slice(0, 3) // Pick 3 random colors

        for (const colorName of randomColors) {
            const basePrice = Math.floor(Math.random() * 2000) + 500

            // Create Color Layer
            const productColor = await prisma.productColor.create({
                data: {
                    modelId: model.id,
                    name: colorName,
                    colorCode: colorName.substring(0, 3).toUpperCase()
                }
            })

            for (const size of SIZES) {
                const barcode = `869${Math.floor(100000000 + Math.random() * 900000000)}`

                await prisma.productVariant.create({
                    data: {
                        colorId: productColor.id,
                        barcode: barcode,
                        sku: `${brand.substring(0, 3).toUpperCase()}-${model.id.substring(0, 4)}-${colorName.substring(0, 3)}-${size}`.toUpperCase(),
                        size,
                        purchasePrice: basePrice * 0.6,
                        salePrice: basePrice,
                        stocks: {
                            create: allStores.map((store: any) => ({
                                storeId: store.id,
                                quantity: Math.floor(Math.random() * 20) // 0-20 stock per store
                            }))
                        }
                    }
                })
            }
        }

        if (i % 10 === 0) console.log(`Created model ${i} / ${MODELS_COUNT}`)
    }

    console.log('Seeding completed!')
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
