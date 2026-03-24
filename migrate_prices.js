const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting data migration...");
    // Direct raw SQL is fastest and avoids any Prisma Client updateMany limitations
    const result = await prisma.$executeRaw`UPDATE "SaleItem" SET "originalPrice" = "price", "finalPrice" = "price"`;
    console.log(`Updated ${result} rows in SaleItem.`);
}

main()
    .catch(e => {
        console.error("Migration error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
