
import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("-----------------------------------------")
    console.log(" EMERGENCY ADMIN PASSWORD RESET")
    console.log("-----------------------------------------")

    // Default credentials
    const targetUser = "admin"
    const newPass = "1234"
    const hashed = await hash(newPass, 10)

    console.log(`Hedef Kullanıcı: ${targetUser}`)
    console.log(`Yeni Şifre:      ${newPass}`)
    console.log("...")

    try {
        await prisma.user.upsert({
            where: { username: targetUser },
            update: {
                password: hashed,
                role: "ADMIN"
            },
            create: {
                username: targetUser,
                password: hashed,
                name: "Yönetici (Reset)",
                role: "ADMIN",
                permissions: JSON.stringify(["ALL"])
            }
        })
        console.log("BASARILI! ✔️")
        console.log("Artık 'admin' ve '1234' ile giriş yapabilirsiniz.")
    } catch (e: any) {
        console.error("HATA OLUSTU ❌")
        console.error(e.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
