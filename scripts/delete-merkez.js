const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const merkez = await prisma.store.findFirst({
        where: { name: "Merkez Şube" }
    });

    if (!merkez) {
        console.log("Merkez Şube not found.");
        return;
    }

    console.log("Deleting Merkez Şube:", merkez.id);

    // 1. Delete SaleItems for Sales in this store
    // Find sales first
    const sales = await prisma.sale.findMany({
        where: { storeId: merkez.id },
        select: { id: true }
    });
    const saleIds = sales.map(s => s.id);

    if (saleIds.length > 0) {
        console.log(`Deleting items for ${saleIds.length} sales...`);
        await prisma.saleItem.deleteMany({
            where: { saleId: { in: saleIds } }
        });

        // 2. Delete Sales
        await prisma.sale.deleteMany({
            where: { id: { in: saleIds } }
        });
    }

    // 3. Delete Stocks
    await prisma.stock.deleteMany({
        where: { storeId: merkez.id }
    });

    // 4. Update users
    await prisma.user.updateMany({
        where: { storeId: merkez.id },
        data: { storeId: null }
    });

    // 5. Delete Store
    await prisma.store.delete({
        where: { id: merkez.id }
    });

    console.log("Merkez Şube deleted successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
