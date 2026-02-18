const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Multi-Store data...');

    // 1. Clean up existing data (Optional, but good for "reset" feeling)
    // Be careful if you want to keep data, but user asked for "give me 3 stores".
    // Let's NOT delete everything to avoid losing products, but maybe ensure these 3 exist.
    // Actually, to ensure clean auth, let's upsert everything.

    // 2. Create ADMIN
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: { password: adminPassword, role: 'ADMIN', name: 'Sistem Yöneticisi' },
        create: {
            username: 'admin',
            password: adminPassword,
            name: 'Sistem Yöneticisi',
            role: 'ADMIN'
        },
    });
    console.log('Admin verified: admin / admin123');

    // 3. Define Stores and Users
    const storesToCreate = [
        { name: 'Şube 1', username: 'sube1', userFullname: 'Şube 1 Kasa' },
        { name: 'Şube 2', username: 'sube2', userFullname: 'Şube 2 Kasa' },
        { name: 'Şube 3', username: 'sube3', userFullname: 'Şube 3 Kasa' }
    ];

    const commonPassword = await bcrypt.hash('1234', 10);

    for (const s of storesToCreate) {
        // Upsert Store
        // We can't easy upsert by name because name isn't unique in schema usually, but let's check.
        // Let's try to find first.
        let store = await prisma.store.findFirst({ where: { name: s.name } });
        if (!store) {
            store = await prisma.store.create({
                data: { name: s.name, location: 'İstanbul', phone: '05550000000' }
            });
            console.log(`Created Store: ${s.name}`);
        } else {
            console.log(`Store already exists: ${s.name}`);
        }

        // Upsert User
        await prisma.user.upsert({
            where: { username: s.username },
            update: {
                password: commonPassword,
                role: 'CASHIER',
                storeId: store.id,
                name: s.userFullname
            },
            create: {
                username: s.username,
                password: commonPassword,
                name: s.userFullname,
                role: 'CASHIER',
                storeId: store.id
            }
        });
        console.log(`User ready: ${s.username} / 1234 -> Assigned to ${s.name}`);
    }

    console.log('Seeding finished. You can now login with:');
    console.log('- sube1 / 1234');
    console.log('- sube2 / 1234');
    console.log('- sube3 / 1234');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
