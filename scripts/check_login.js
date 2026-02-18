
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function checkAdmin() {
    const user = await prisma.user.findUnique({
        where: { username: 'admin' }
    });
    console.log("User:", user);
    if (user) {
        console.log("Password stored:", user.password);
        try {
            const match = await bcrypt.compare('admin123', user.password);
            console.log("Compare 'admin123':", match);
        } catch (e) {
            console.log("Compare error:", e.message);
        }
    }
}

checkAdmin();
