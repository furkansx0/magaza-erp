
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function testUpdateStore() {
    console.log("Starting updateStore test...");

    // 1. Get a store
    const store = await prisma.store.findFirst();
    if (!store) {
        console.log("No store found.");
        return;
    }
    console.log("Testing with store:", store.name);

    // 2. Simulate "updateStore" logic manually since we can't call server action
    const newUsername = "magaza_giris";
    const newPassword = "gizli_sifre";

    // Find associated user
    const storeWithUsers = await prisma.store.findUnique({
        where: { id: store.id },
        include: { users: true }
    });

    let targetUser = storeWithUsers.users[0];

    if (!targetUser) {
        console.log("No user found for store, simulating creation...");
        targetUser = await prisma.user.create({
            data: {
                name: store.name,
                username: newUsername,
                password: await bcrypt.hash(newPassword, 10),
                role: "CASHIER",
                storeId: store.id
            }
        });
    } else {
        console.log("Updating existing user:", targetUser.username);
        await prisma.user.update({
            where: { id: targetUser.id },
            data: {
                username: newUsername,
                password: await bcrypt.hash(newPassword, 10)
            }
        });
    }

    // 3. Verify Login
    const updatedUser = await prisma.user.findUnique({ where: { username: newUsername } });
    const match = await bcrypt.compare(newPassword, updatedUser.password);

    console.log("Login check for 'magaza_giris':", match ? "SUCCESS" : "FAILED");
    console.log("User Role:", updatedUser.role);
    console.log("Required Redirect:", (updatedUser.role === "ADMIN" || updatedUser.role === "SYSTEM_USER") ? "/dashboard" : "/pos");
}

testUpdateStore()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
