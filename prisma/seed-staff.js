const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany();
    const password = await hash("1234", 10);

    for (const store of stores) {
        console.log(`Adding staff for ${store.name}...`);

        const staffList = [
            `Personel 1 (${store.name})`,
            `Personel 2 (${store.name})`,
            `Personel 3 (${store.name})`
        ];

        for (const name of staffList) {
            const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 10);
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const username = `s${store.name.substring(0, 1).toLowerCase()}_${cleanName}_${randomSuffix}`;

            // Check if exists? Skip.
            // Just create.
            await prisma.user.create({
                data: {
                    name: name,
                    username: username,
                    password: password,
                    role: "CASHIER",
                    storeId: store.id
                }
            });
            console.log(`  - Created ${name} (${username})`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
