import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Config
const MODEL_COUNT = 150; // 150 Models * ~3 Colors * ~5 Sizes = ~2250 Variants
const STORES = [
    { name: "Merkez Depo", code: "MAIN", type: "WAREHOUSE" },
    { name: "Kadıköy Mağaza", code: "KDK", type: "STORE" },
    { name: "Beşiktaş Mağaza", code: "BES", type: "STORE" }
];

const BRANDS = ["Nike", "Adidas", "Puma", "Greyder", "Lumberjack", "Skechers", "Vans"];
const CATEGORIES = [
    { label: "Bot", sub: ["Outdoor", "Klasik", "Kar Botu"] },
    { label: "Spor Ayakkabı", sub: ["Koşu", "Yürüyüş", "Basketbol"] },
    { label: "Terlik", sub: ["Plaj", "Ev", "Ortopedik"] }
];
const COLORS = ["Siyah", "Beyaz", "Lacivert", "Haki", "Taba", "Kırmızı", "Gri"];
const SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
const MATERIALS = ["Deri", "Süet", "Nubuk", "Tekstil"];
const SEASONS = ["2024 Yaz", "2024 Kış", "2025 Yaz"];

async function main() {
    console.log("🚀 Starting Large Scale WMS Seed...");

    // 1. Create Stores
    const storeMap = new Map();
    for (const s of STORES) {
        let store = await prisma.store.findFirst({ where: { name: s.name } });
        if (!store) {
            store = await prisma.store.create({ data: s });
            console.log(`Created Store: ${s.name}`);
        }
        storeMap.set(s.type === "WAREHOUSE" ? "MAIN" : store.id, store.id);
    }
    const storeIds = Array.from(storeMap.values());

    // 2. Clear Products (Optional - be careful in prod)
    // await prisma.productModel.deleteMany({}); 

    // 3. Generate Products
    for (let i = 0; i < MODEL_COUNT; i++) {
        const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
        const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const sub = cat.sub[Math.floor(Math.random() * cat.sub.length)];
        const name = `${brand} ${sub} ${Math.floor(Math.random() * 1000)}`;

        const model = await prisma.productModel.create({
            data: {
                name,
                brand,
                gender: ["Erkek", "Kadın", "Çocuk"][Math.floor(Math.random() * 3)],
                category: cat.label,
                subCategory: sub,
                attributes: JSON.stringify({
                    material: MATERIALS[Math.floor(Math.random() * MATERIALS.length)],
                    season: SEASONS[Math.floor(Math.random() * SEASONS.length)],
                    style: "Bağcıklı"
                })
            }
        });

        // Generate Variants (2-3 Colors)
        const colorCount = 2 + Math.floor(Math.random() * 2);
        for (let c = 0; c < colorCount; c++) {
            const colorName = COLORS[Math.floor(Math.random() * COLORS.length)];

            // Create Color Layer
            const productColor = await prisma.productColor.create({
                data: {
                    modelId: model.id,
                    name: colorName,
                    colorCode: colorName.substring(0, 3).toUpperCase()
                }
            });

            // Generate Sizes (5-8 Sizes)
            const sizeStart = Math.floor(Math.random() * 3); // Start from 36, 37 or 38
            const sizeCount = 5 + Math.floor(Math.random() * 3); // 5 to 7 sizes

            for (let s = 0; s < sizeCount; s++) {
                const size = SIZES[sizeStart + s];
                if (!size) continue;

                const sku = `${brand.substring(0, 3).toUpperCase()}-${model.gender?.substring(0, 1)}-${Math.floor(Math.random() * 99999)}`;
                // Unique Barcode: 13 digits
                const barcode = `${2000000000000 + Math.floor(Math.random() * 999999999)}`;

                const purchasePrice = 500 + Math.floor(Math.random() * 1000);
                const salePrice = purchasePrice * 2;

                const variant = await prisma.productVariant.create({
                    data: {
                        colorId: productColor.id,
                        sku,
                        barcode, // collisions possible but rare in seed
                        size,
                        purchasePrice,
                        salePrice,
                        stocks: {
                            create: storeIds.map(sid => ({
                                storeId: sid,
                                quantity: Math.floor(Math.random() * 50) // 0-50 stock per store
                            }))
                        }
                    }
                });

                // Ledger Entries for Initial Stock
                for (const sid of storeIds) {
                    // Note: We'd need to fetch the stock we just created to be precise, or just assume the random val.
                    // For seed speed, we skip the exact ledger loop or do it if needed.
                    // Omitting detailed Ledger for now to speed up seed, focus on grid UI load test.
                }
            }
        }
        if (i % 10 === 0) console.log(`Generated ${i} / ${MODEL_COUNT} Models...`);
    }

    console.log("✅ Seeding Complete!");
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
