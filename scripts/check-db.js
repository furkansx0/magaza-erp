const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Stores ---');
    const stores = await prisma.store.findMany();
    console.table(stores);

    console.log('\n--- Users ---');
    const users = await prisma.user.findMany({
        include: { store: true }
    });

    users.forEach(u => {
        console.log(`${u.username} (${u.role}) -> Store: ${u.store ? u.store.name : 'NONE'} (ID: ${u.storeId})`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
