const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const password = await bcrypt.hash("123123", 10);
    try {
        const admin = await db.user.upsert({
            where: { username: "admin" },
            update: {},
            create: {
                username: "admin",
                password: password,
                name: "Yönetici",
                role: "ADMIN"
            }
        });
        console.log("Admin created:", admin.username);
    } catch (e) {
        console.error(e);
    } finally {
        await db.$disconnect();
    }
}
main();
